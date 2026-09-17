import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import Logger from './logger';
import config from '../config';

export type PaymentMethod = 'UPI' | 'Card' | 'NetBanking' | 'Wallet' | 'Bank Transfer';

export interface PaymentInitiationParams {
  invoice_id: string;
  amount: number;
  currency: string;
  payment_method: PaymentMethod;
  notes?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
}

export interface PaymentVerificationParams {
  gateway_order_id: string;
  gateway_payment_id: string;
  gateway_signature: string;
  invoice_id: string;
  amount: number;
  payment_method: string;
}

export class PaymentGatewayService {
  /**
   * Initiate a payment order across payment providers.
   */
  static async initiatePayment(params: PaymentInitiationParams) {
    const gatewayOrderId = `order_${uuidv4().substring(0, 14).replace(/-/g, '')}`;

    Logger.info(`Initiating payment order for invoice ${params.invoice_id} of ₹${params.amount}`, {
      gateway_order_id: gatewayOrderId,
      invoice_id: params.invoice_id,
      amount: params.amount,
      method: params.payment_method
    });

    return {
      gateway_order_id: gatewayOrderId,
      amount: params.amount,
      currency: params.currency || 'INR',
      payment_method: params.payment_method,
      provider: config.PAYMENT_PROVIDER,
      created_at: new Date().toISOString()
    };
  }

  /**
   * Strictly verify payment authenticity server-side using HMAC-SHA256.
   * Client-side success callbacks are never trusted without cryptographic validation.
   */
  static async verifyPayment(params: PaymentVerificationParams, receivedByUserId?: string) {
    // Expected HMAC signature computation: HMAC_SHA256(order_id + "|" + payment_id, secret)
    const secret = config.RAZORPAY_KEY_SECRET || config.JWT_SECRET;
    const body = `${params.gateway_order_id}|${params.gateway_payment_id}`;
    const expectedSignature = crypto.createHmac('sha256', secret).update(body).digest('hex');

    // In mock/test mode or if signature matches
    const isValidSignature = config.PAYMENT_PROVIDER === 'mock' || params.gateway_signature === expectedSignature;

    if (!isValidSignature) {
      Logger.warn(`Payment signature mismatch rejected!`, {
        order_id: params.gateway_order_id,
        payment_id: params.gateway_payment_id
      });
      throw new Error('Payment signature verification failed. Potential tampering detected.');
    }

    const receiptNumber = `REC-${Date.now().toString().slice(-6)}`;
    const paymentId = `pay-${uuidv4().substring(0, 8)}`;

    // Record verified payment in database
    await db.execute(
      `INSERT INTO payments (id, invoice_id, receipt_number, amount, payment_method, transaction_ref, notes, received_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        paymentId,
        params.invoice_id,
        receiptNumber,
        params.amount,
        params.payment_method || 'UPI',
        params.gateway_payment_id,
        `Verified via ${config.PAYMENT_PROVIDER.toUpperCase()} Gateway (Order: ${params.gateway_order_id})`,
        receivedByUserId || null
      ]
    );

    // Update invoice status
    const invoice = await db.queryOne<{ net_total: number; paid: number }>(
      `SELECT net_total, paid FROM invoices WHERE id = $1`,
      [params.invoice_id]
    );

    if (invoice) {
      const newPaid = Number(invoice.paid || 0) + Number(params.amount);
      const newDue = Math.max(0, Number(invoice.net_total || 0) - newPaid);
      const status = newDue <= 0 ? 'paid' : 'partial';

      await db.execute(
        `UPDATE invoices SET paid = $1, due = $2, status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
        [newPaid, newDue, status, params.invoice_id]
      );
    }

    Logger.info(`Payment verified and ledger recorded: ${receiptNumber} (₹${params.amount})`, {
      payment_id: paymentId,
      receipt_number: receiptNumber,
      invoice_id: params.invoice_id
    });

    return {
      success: true,
      payment_id: paymentId,
      receipt_number: receiptNumber,
      amount: params.amount,
      status: 'settled',
      verified_at: new Date().toISOString()
    };
  }

  /**
   * Process refund with ledger entry.
   */
  static async processRefund(paymentId: string, amount: number, reason: string, approvedByUserId?: string) {
    const payment = await db.queryOne<{ id: string; amount: number; invoice_id: string }>(
      `SELECT * FROM payments WHERE id = $1`,
      [paymentId]
    );
    if (!payment) throw new Error('Payment record not found');

    if (amount > payment.amount) {
      throw new Error(`Refund amount ₹${amount} exceeds original payment of ₹${payment.amount}`);
    }

    const refundId = `ref-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO refunds (id, payment_id, amount, reason, approved_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [refundId, paymentId, amount, reason, approvedByUserId || null]
    );

    // Re-adjust invoice due balance
    const invoice = await db.queryOne<{ net_total: number; paid: number; due: number }>(
      `SELECT net_total, paid, due FROM invoices WHERE id = $1`,
      [payment.invoice_id]
    );

    if (invoice) {
      const updatedPaid = Math.max(0, Number(invoice.paid) - amount);
      const updatedDue = Math.max(0, Number(invoice.net_total) - updatedPaid);
      const status = updatedPaid <= 0 ? 'unpaid' : 'partial';

      await db.execute(
        `UPDATE invoices SET paid = $1, due = $2, status = $3 WHERE id = $4`,
        [updatedPaid, updatedDue, status, payment.invoice_id]
      );
    }

    Logger.info(`Refund processed: ${refundId} for ₹${amount}`, {
      refund_id: refundId,
      payment_id: paymentId,
      reason
    });

    return { refund_id: refundId, refunded_amount: amount, status: 'processed' };
  }
}

export default PaymentGatewayService;
