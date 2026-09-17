/**
 * BillingService — Invoicing, Payments & Financial Operations (Section 10)
 * 
 * Enforces:
 * - Billing module owns invoices, payments, refunds, taxes, discounts
 * - Billing NEVER mutates clinical order or test state directly
 * - Emits domain events (invoice.created, payment.completed, refund.completed)
 */

import { v4 as uuidv4 } from 'uuid';
import { billingRepository } from '../../repositories/FinanceRepositories';
import { IBillingService, InvoiceCalculationInput, PaymentInput } from '../../types/serviceContracts';
import DomainEventBus from '../domainEventBus';
import { logAudit } from '../auditService';

export class BillingService implements IBillingService {
  async calculateInvoice(input: InvoiceCalculationInput): Promise<{ gross_amount: number; discount_amount: number; tax_amount: number; net_amount: number }> {
    let gross = 0;
    for (const item of input.items) {
      gross += (item.unit_price || 0) * (item.quantity || 1);
    }

    let discount = 0;
    if (input.discount_type === 'percentage' && input.discount_value) {
      discount = (gross * input.discount_value) / 100;
    } else if (input.discount_type === 'fixed' && input.discount_value) {
      discount = input.discount_value;
    }

    const taxable = Math.max(0, gross - discount);
    const taxRate = input.tax_rate || 0;
    const tax = (taxable * taxRate) / 100;
    const net = Math.round((taxable + tax) * 100) / 100;

    return {
      gross_amount: gross,
      discount_amount: discount,
      tax_amount: tax,
      net_amount: net
    };
  }

  async createInvoice(input: InvoiceCalculationInput, actorId: string): Promise<any> {
    const calc = await this.calculateInvoice(input);
    const invoiceId = `inv-${uuidv4().substring(0, 8)}`;
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

    await billingRepository.execute(
      `INSERT INTO invoices (id, lab_id, order_id, invoice_number, gross_amount, discount_amount, tax_amount, net_amount, paid_amount, balance_amount, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $8, 'unpaid')`,
      [invoiceId, input.lab_id, input.order_id, invoiceNumber, calc.gross_amount, calc.discount_amount, calc.tax_amount, calc.net_amount]
    );

    for (const it of input.items) {
      await billingRepository.execute(
        `INSERT INTO invoice_items (id, invoice_id, test_id, item_name, unit_price, quantity, total_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [`ii-${uuidv4().substring(0, 8)}`, invoiceId, it.test_id, it.item_name, it.unit_price, it.quantity || 1, it.unit_price * (it.quantity || 1)]
      );
    }

    // Emit Domain Event
    await DomainEventBus.publish(
      'invoice.created',
      input.lab_id,
      {
        invoice_id: invoiceId,
        invoice_number: invoiceNumber,
        order_id: input.order_id,
        net_amount: calc.net_amount
      },
      { actorId }
    );

    return {
      invoice_id: invoiceId,
      invoice_number: invoiceNumber,
      ...calc
    };
  }

  async recordPayment(input: PaymentInput): Promise<{ receipt_number: string; balance_amount: number; payment_status: string }> {
    const invoice = await billingRepository.findInvoiceById(input.invoice_id);
    if (!invoice) throw new Error('Invoice not found');

    const paymentId = `pay-${uuidv4().substring(0, 8)}`;
    const receiptNumber = `REC-${Date.now().toString().slice(-6)}`;

    await billingRepository.recordPayment({
      id: paymentId,
      invoice_id: input.invoice_id,
      receipt_number: receiptNumber,
      amount: input.amount,
      payment_method: input.payment_method,
      transaction_ref: input.transaction_ref,
      received_by: input.received_by,
      notes: input.notes
    });

    const newPaid = (invoice.paid_amount || 0) + input.amount;
    const newBalance = Math.max(0, invoice.net_amount - newPaid);
    const newStatus = newBalance <= 0 ? 'paid' : 'partial';

    await billingRepository.execute(
      `UPDATE invoices SET paid_amount = $1, balance_amount = $2, status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
      [newPaid, newBalance, newStatus, input.invoice_id]
    );

    // Emit Domain Event
    await DomainEventBus.publish(
      'payment.completed',
      input.lab_id,
      {
        payment_id: paymentId,
        invoice_id: input.invoice_id,
        order_id: input.order_id,
        receipt_number: receiptNumber,
        amount: input.amount,
        balance_amount: newBalance,
        payment_status: newStatus
      },
      { actorId: input.received_by }
    );

    return {
      receipt_number: receiptNumber,
      balance_amount: newBalance,
      payment_status: newStatus
    };
  }

  async refundPayment(paymentId: string, reason: string, actorId: string, labId: string): Promise<{ refund_id: string; status: string }> {
    const refundId = `ref-${uuidv4().substring(0, 8)}`;
    await billingRepository.execute(
      `INSERT INTO payment_refunds (id, payment_id, refund_amount, reason, processed_by)
       VALUES ($1, $2, 0, $3, $4)`,
      [refundId, paymentId, reason, actorId]
    );

    await DomainEventBus.publish(
      'refund.completed',
      labId,
      { refund_id: refundId, payment_id: paymentId, reason },
      { actorId }
    );

    return { refund_id: refundId, status: 'processed' };
  }

  async applyDiscount(invoiceId: string, discountType: 'fixed' | 'percentage', discountValue: number, actorId: string, labId: string): Promise<any> {
    const inv = await billingRepository.findInvoiceById(invoiceId);
    if (!inv) throw new Error('Invoice not found');

    const discountAmount = discountType === 'percentage' ? (inv.gross_amount * discountValue) / 100 : discountValue;
    const newNet = Math.max(0, inv.gross_amount - discountAmount + (inv.tax_amount || 0));
    const newBalance = Math.max(0, newNet - (inv.paid_amount || 0));

    await billingRepository.execute(
      `UPDATE invoices SET discount_amount = $1, net_amount = $2, balance_amount = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
      [discountAmount, newNet, newBalance, invoiceId]
    );

    return { invoice_id: invoiceId, discount_amount: discountAmount, net_amount: newNet, balance_amount: newBalance };
  }

  async getInvoice(invoiceId: string, labId: string): Promise<any> {
    return billingRepository.findInvoiceById(invoiceId, labId);
  }

  async getPaymentStatus(orderId: string, labId: string): Promise<{ invoice_id: string; net_amount: number; paid_amount: number; balance_amount: number; status: string }> {
    const invoice = await billingRepository.findInvoiceByOrderId(orderId);
    if (!invoice) {
      return { invoice_id: '', net_amount: 0, paid_amount: 0, balance_amount: 0, status: 'unbilled' };
    }
    return {
      invoice_id: invoice.id,
      net_amount: invoice.net_amount,
      paid_amount: invoice.paid_amount,
      balance_amount: invoice.balance_amount,
      status: invoice.status
    };
  }
}

export const billingService = new BillingService();
export default billingService;
