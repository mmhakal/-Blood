/**
 * BillingRepository & AccountingRepository — Finance & Ledger Repositories
 */

import { BaseRepository } from './BaseRepository';

export class BillingRepository extends BaseRepository {
  public readonly moduleName = 'FINANCE.billing';
  public readonly tablesOwned = [
    'invoices',
    'invoice_items',
    'payments',
    'payment_refunds'
  ];

  async findInvoiceById(invoiceId: string, labId?: string) {
    if (labId) {
      return this.queryOne(`SELECT * FROM invoices WHERE id = $1 AND lab_id = $2`, [invoiceId, labId]);
    }
    return this.queryOne(`SELECT * FROM invoices WHERE id = $1`, [invoiceId]);
  }

  async findInvoiceByOrderId(orderId: string) {
    return this.queryOne(`SELECT * FROM invoices WHERE order_id = $1`, [orderId]);
  }

  async getInvoiceItems(invoiceId: string) {
    return this.query(`SELECT * FROM invoice_items WHERE invoice_id = $1`, [invoiceId]);
  }

  async recordPayment(data: {
    id: string;
    invoice_id: string;
    receipt_number: string;
    amount: number;
    payment_method: string;
    transaction_ref?: string;
    received_by: string;
    notes?: string;
  }) {
    this.validateTableAccess('payments', 'INSERT');
    return this.execute(
      `INSERT INTO payments (id, invoice_id, receipt_number, amount, payment_method, transaction_reference, received_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [data.id, data.invoice_id, data.receipt_number, data.amount, data.payment_method, data.transaction_ref || null, data.received_by, data.notes || null]
    );
  }
}

export class AccountingRepository extends BaseRepository {
  public readonly moduleName = 'FINANCE.accounting';
  public readonly tablesOwned = [
    'chart_of_accounts',
    'accounting_ledgers',
    'journal_entries',
    'expenses',
    'cash_closings'
  ];

  async recordJournalEntry(data: {
    id: string;
    lab_id: string;
    entry_number: string;
    account_id: string;
    debit_amount: number;
    credit_amount: number;
    description: string;
    reference_type: string;
    reference_id: string;
  }) {
    this.validateTableAccess('journal_entries', 'INSERT');
    return this.execute(
      `INSERT INTO journal_entries (id, lab_id, entry_number, account_id, debit_amount, credit_amount, description, reference_type, reference_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [data.id, data.lab_id, data.entry_number, data.account_id, data.debit_amount, data.credit_amount, data.description, data.reference_type, data.reference_id]
    );
  }
}

export const billingRepository = new BillingRepository();
export const accountingRepository = new AccountingRepository();
