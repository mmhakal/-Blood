import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { auditFromReq } from '../services/auditService';

const router = Router();

// GET /api/billing/invoices - list invoices
router.get('/invoices', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const labId = req.user?.lab_id;
    const branchId = req.query.branch_id as string || req.user?.branch_id;
    const status = req.query.status as string; // unpaid, partial, paid, refunded
    const search = req.query.search as string;

    let query = `
      SELECT i.*,
             o.order_number, o.lab_number,
             p.name as patient_name, p.patient_id_code, p.mobile as patient_mobile,
             b.name as branch_name
      FROM invoices i
      JOIN test_orders o ON i.order_id = o.id
      JOIN patients p ON o.patient_id = p.id
      LEFT JOIN branches b ON i.branch_id = b.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (labId) {
      params.push(labId);
      query += ` AND i.lab_id = $${params.length}`;
    }

    if (branchId) {
      params.push(branchId);
      query += ` AND i.branch_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND i.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const idx = params.length;
      query += ` AND (LOWER(p.name) LIKE $${idx} OR i.invoice_number LIKE $${idx} OR o.order_number LIKE $${idx} OR p.patient_id_code LIKE $${idx})`;
    }

    query += ` ORDER BY i.created_at DESC LIMIT 100`;

    const invoices = await db.query(query, params);
    res.json(invoices);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/billing/invoices/:id - invoice details with items & payment history
router.get('/invoices/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const invoiceId = req.params.id;
    const invoice = await db.queryOne(
      `SELECT i.*,
              o.order_number, o.lab_number, o.created_at as order_date, o.priority,
              p.name as patient_name, p.patient_id_code, p.mobile as patient_mobile, p.address as patient_address, p.age, p.gender,
              b.name as branch_name, b.phone as branch_phone, b.address as branch_address,
              l.name as lab_name, l.address as lab_address, l.phone as lab_phone, l.email as lab_email, l.tax_number, l.license_number
       FROM invoices i
       JOIN test_orders o ON i.order_id = o.id
       JOIN patients p ON o.patient_id = p.id
       LEFT JOIN branches b ON i.branch_id = b.id
       LEFT JOIN laboratories l ON i.lab_id = l.id
       WHERE i.id = $1`,
      [invoiceId]
    );

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    if (req.user?.lab_id && invoice.lab_id !== req.user.lab_id) {
      res.status(403).json({ error: 'Access denied: Cannot access invoice from another laboratory' });
      return;
    }

    const items = await db.query(
      `SELECT ii.* FROM invoice_items ii WHERE ii.invoice_id = $1`,
      [invoiceId]
    );

    // Fallback if invoice_items not yet populated
    const fallbackItems = items.length > 0 ? items : await db.query(
      `SELECT id, test_id, item_name, 1 as quantity, price as unit_price, discount, 0 as tax, net_price as total FROM order_items WHERE order_id = $1`,
      [invoice.order_id]
    );

    const payments = await db.query(
      `SELECT p.*, u.name as received_by_name
       FROM payments p
       LEFT JOIN users u ON p.received_by = u.id
       WHERE p.invoice_id = $1
       ORDER BY p.created_at DESC`,
      [invoiceId]
    );

    const refunds = await db.query(
      `SELECT r.*, u.name as approved_by_name
       FROM refunds r
       JOIN payments p ON r.payment_id = p.id
       LEFT JOIN users u ON r.approved_by = u.id
       WHERE p.invoice_id = $1
       ORDER BY r.created_at DESC`,
      [invoiceId]
    );

    res.json({ invoice, items: fallbackItems, payments, refunds });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper function to record a payment
async function recordPayment(invoiceId: string, amount: number, method: string, ref: string, notes: string, req: AuthRequest, res: Response) {
  const invoice = await db.queryOne<{ id: string; order_id: string; net_total: number; paid: number; due: number; lab_id: string; invoice_number: string }>(
    `SELECT id, order_id, net_total, paid, due, lab_id, invoice_number FROM invoices WHERE id = $1`,
    [invoiceId]
  );

  if (!invoice) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }

  if (req.user?.lab_id && invoice.lab_id !== req.user.lab_id) {
    res.status(403).json({ error: 'Access denied: Cannot record payment for another laboratory' });
    return;
  }

  const payAmount = Math.round(amount * 100) / 100;
  if (payAmount <= 0) {
    res.status(400).json({ error: 'Payment amount must be positive' });
    return;
  }

  const newPaid = Math.round((invoice.paid + payAmount) * 100) / 100;
  const newDue = Math.max(0, Math.round((invoice.net_total - newPaid) * 100) / 100);
  const newStatus = newPaid > invoice.net_total ? 'overpaid' : newDue === 0 ? 'paid' : 'partial';

  const paymentId = `pay-${uuidv4().substring(0, 8)}`;
  const year = new Date().getFullYear();
  const countRes = await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM payments WHERE invoice_id = $1`, [invoiceId]);
  const nextSeq = (parseInt(countRes?.count as any || '0') + 1).toString().padStart(4, '0');
  const receiptNumber = `REC-${year}-${nextSeq}`;

  await db.execute(
    `INSERT INTO payments (id, invoice_id, receipt_number, amount, payment_method, transaction_ref, notes, received_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [paymentId, invoiceId, receiptNumber, payAmount, method || 'Cash', ref || '', notes || '', req.user?.id || null]
  );

  await db.execute(
    `UPDATE invoices SET paid = $1, due = $2, status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
    [newPaid, newDue, newStatus, invoiceId]
  );

  await db.execute(
    `UPDATE test_orders SET paid_amount = $1, due_amount = $2, payment_status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
    [newPaid, newDue, newStatus, invoice.order_id]
  );

  auditFromReq(req, 'RECEIVE_PAYMENT', 'payment', paymentId, null, {
    invoice_id: invoiceId,
    invoice_number: invoice.invoice_number,
    amount: payAmount,
    receiptNumber,
    payment_method: method
  });

  res.status(201).json({
    message: 'Payment recorded successfully',
    payment_id: paymentId,
    receipt_number: receiptNumber,
    amount: payAmount,
    paid: newPaid,
    due: newDue,
    status: newStatus
  });
}

// POST /api/billing/payments - record payment
router.post('/payments', authenticateToken, requirePermission('receive_payments'), async (req: AuthRequest, res: Response) => {
  const { invoice_id, amount, payment_method, transaction_ref, notes } = req.body;
  if (!invoice_id || !amount) {
    res.status(400).json({ error: 'Invoice ID and payment amount are required' });
    return;
  }
  try {
    await recordPayment(invoice_id, parseFloat(amount), payment_method, transaction_ref, notes, req, res);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/billing/invoices/:id/payments - record payment against specific invoice
router.post('/invoices/:id/payments', authenticateToken, requirePermission('receive_payments'), async (req: AuthRequest, res: Response) => {
  const invoiceId = req.params.id as string;
  const { amount, payment_method, transaction_ref, notes } = req.body;
  if (!amount) {
    res.status(400).json({ error: 'Payment amount is required' });
    return;
  }
  try {
    await recordPayment(invoiceId, parseFloat(amount), payment_method, transaction_ref, notes, req, res);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/billing/payments/:id/refund - process refund
router.post('/payments/:id/refund', authenticateToken, async (req: AuthRequest, res: Response) => {
  const paymentId = req.params.id as string;
  const { amount, reason } = req.body;
  const userRole = req.user?.role_code;
  const userPerms = req.user?.permissions || [];

  if (userRole !== 'super_admin' && !userPerms.includes('refund_payment') && !userPerms.includes('manage_billing')) {
    res.status(403).json({ error: 'Permission Denied: Missing required permission to process refunds.' });
    return;
  }

  if (!amount || parseFloat(amount) <= 0 || !reason) {
    res.status(400).json({ error: 'Positive refund amount and reason are required' });
    return;
  }

  try {
    const payment = await db.queryOne<{ id: string; invoice_id: string; amount: number; receipt_number: string }>(
      `SELECT id, invoice_id, amount, receipt_number FROM payments WHERE id = $1`,
      [paymentId]
    );

    if (!payment) {
      res.status(404).json({ error: 'Payment record not found' });
      return;
    }

    const invoice = await db.queryOne<{ id: string; order_id: string; net_total: number; paid: number; due: number; lab_id: string }>(
      `SELECT id, order_id, net_total, paid, due, lab_id FROM invoices WHERE id = $1`,
      [payment.invoice_id]
    );

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    if (req.user?.lab_id && invoice.lab_id !== req.user.lab_id) {
      res.status(403).json({ error: 'Access denied: Cannot refund payment from another laboratory' });
      return;
    }

    const refundAmount = parseFloat(amount);
    if (refundAmount > payment.amount) {
      res.status(400).json({ error: `Refund amount (₹${refundAmount}) cannot exceed original payment amount (₹${payment.amount})` });
      return;
    }

    const refundId = `ref-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO refunds (id, payment_id, amount, reason, approved_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [refundId, paymentId, refundAmount, reason, req.user?.id || null]
    );

    const newPaid = Math.max(0, Math.round((invoice.paid - refundAmount) * 100) / 100);
    const newDue = Math.max(0, Math.round((invoice.net_total - newPaid) * 100) / 100);
    const newStatus = newPaid === 0 ? 'refunded' : newDue > 0 ? 'partial' : 'paid';

    await db.execute(
      `UPDATE invoices SET paid = $1, due = $2, status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
      [newPaid, newDue, newStatus, invoice.id]
    );

    await db.execute(
      `UPDATE test_orders SET paid_amount = $1, due_amount = $2, payment_status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
      [newPaid, newDue, newStatus, invoice.order_id]
    );

    auditFromReq(req, 'PROCESS_REFUND', 'refund', refundId, null, {
      payment_id: paymentId,
      receipt_number: payment.receipt_number,
      refund_amount: refundAmount,
      reason
    });

    res.json({
      message: `Refund of ₹${refundAmount} processed successfully`,
      refund_id: refundId,
      new_paid: newPaid,
      new_due: newDue,
      invoice_status: newStatus
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/billing/receipts/:paymentId - Printable receipt data
router.get('/receipts/:paymentId', authenticateToken, async (req: AuthRequest, res: Response) => {
  const paymentId = req.params.paymentId;

  try {
    const payment = await db.queryOne(
      `SELECT p.*,
              i.lab_id as lab_id,
              i.invoice_number, i.net_total, i.paid as invoice_paid, i.due as balance_due, i.status as invoice_status,
              o.order_number, o.lab_number, o.created_at as order_date,
              pt.name as patient_name, pt.patient_id_code, pt.mobile as patient_mobile, pt.age, pt.gender,
              b.name as branch_name, b.phone as branch_phone, b.address as branch_address,
              l.name as lab_name, l.address as lab_address, l.phone as lab_phone, l.tax_number,
              u.name as received_by_name
       FROM payments p
       JOIN invoices i ON p.invoice_id = i.id
       JOIN test_orders o ON i.order_id = o.id
       JOIN patients pt ON o.patient_id = pt.id
       LEFT JOIN branches b ON i.branch_id = b.id
       LEFT JOIN laboratories l ON i.lab_id = l.id
       LEFT JOIN users u ON p.received_by = u.id
       WHERE p.id = $1`,
      [paymentId]
    );

    if (!payment) {
      res.status(404).json({ error: 'Receipt not found' });
      return;
    }

    if (req.user?.lab_id && payment.lab_id !== req.user.lab_id) {
      res.status(403).json({ error: 'Access denied: Cannot access receipt from another laboratory' });
      return;
    }

    res.json(payment);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
