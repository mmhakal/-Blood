import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { auditFromReq } from '../services/auditService';
import { checkFeature } from '../middleware/featureGate';

const router = Router();

// GET /api/accounting/dashboard - Financial summary & KPIs
router.get('/dashboard', authenticateToken, checkFeature('accounting'), async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id;
  const branchId = req.query.branch_id as string;

  try {
    let labFilter = '';
    const params: any[] = [];
    if (labId) {
      params.push(labId);
      labFilter = `WHERE lab_id = $${params.length}`;
    }

    let branchFilter = '';
    if (branchId) {
      params.push(branchId);
      branchFilter = labFilter ? ` AND branch_id = $${params.length}` : `WHERE branch_id = $${params.length}`;
    }

    // 1. Today's collections
    const todaySql = `
      SELECT COALESCE(SUM(p.amount), 0) as today_collection
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      WHERE DATE(p.created_at) = CURRENT_DATE
      ${labId ? `AND i.lab_id = '${labId}'` : ''}
      ${branchId ? `AND i.branch_id = '${branchId}'` : ''}
    `;
    const todayRes = await db.queryOne<{ today_collection: number }>(todaySql);

    // 2. Month's collections
    const monthSql = `
      SELECT COALESCE(SUM(p.amount), 0) as month_collection
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      WHERE strftime('%Y-%m', p.created_at) = strftime('%Y-%m', 'now')
      ${labId ? `AND i.lab_id = '${labId}'` : ''}
      ${branchId ? `AND i.branch_id = '${branchId}'` : ''}
    `;
    const monthRes = await db.queryOne<{ month_collection: number }>(monthSql);

    // 3. Outstanding receivables
    const outstandingSql = `
      SELECT COALESCE(SUM(due), 0) as total_outstanding
      FROM invoices
      ${labFilter} ${branchFilter}
    `;
    const outstandingRes = await db.queryOne<{ total_outstanding: number }>(outstandingSql, params);

    // 4. Refunds total
    const refundsSql = `
      SELECT COALESCE(SUM(r.amount), 0) as total_refunds
      FROM refunds r
      ${labId ? `JOIN payments p ON r.payment_id = p.id JOIN invoices i ON p.invoice_id = i.id WHERE i.lab_id = '${labId}'` : ''}
    `;
    const refundsRes = await db.queryOne<{ total_refunds: number }>(refundsSql);

    // 5. Total Expenses this month
    const expensesSql = `
      SELECT COALESCE(SUM(amount), 0) as total_expenses
      FROM expenses
      WHERE strftime('%Y-%m', expense_date) = strftime('%Y-%m', 'now')
      ${labId ? `AND lab_id = '${labId}'` : ''}
      ${branchId ? `AND branch_id = '${branchId}'` : ''}
    `;
    const expensesRes = await db.queryOne<{ total_expenses: number }>(expensesSql);

    const monthCollection = Number(monthRes?.month_collection || 0);
    const totalRefunds = Number(refundsRes?.total_refunds || 0);
    const totalExpenses = Number(expensesRes?.total_expenses || 0);
    const netRevenue = monthCollection - totalRefunds - totalExpenses;

    // 6. Recent transactions (payments & expenses unified)
    const recentPayments = await db.query(
      `SELECT p.id, p.amount, p.payment_method, p.receipt_number as ref, p.created_at as tx_date,
              'payment' as type, i.invoice_number, pt.name as patient_name
       FROM payments p
       JOIN invoices i ON p.invoice_id = i.id
       JOIN test_orders o ON i.order_id = o.id
       JOIN patients pt ON o.patient_id = pt.id
       ${labId ? `WHERE i.lab_id = '${labId}'` : ''}
       ORDER BY p.created_at DESC LIMIT 5`
    );

    const recentExpenses = await db.query(
      `SELECT e.id, e.amount, e.payment_method, e.title as ref, e.expense_date as tx_date,
              'expense' as type, c.name as category_name, e.payee
       FROM expenses e
       LEFT JOIN expense_categories c ON e.category_id = c.id
       ${labId ? `WHERE e.lab_id = '${labId}'` : ''}
       ORDER BY e.created_at DESC LIMIT 5`
    );

    res.json({
      today_collection: Number(todayRes?.today_collection || 0),
      month_collection: monthCollection,
      total_outstanding: Number(outstandingRes?.total_outstanding || 0),
      total_refunds: totalRefunds,
      total_expenses: totalExpenses,
      net_revenue: netRevenue,
      recent_payments: recentPayments,
      recent_expenses: recentExpenses,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/accounting/expenses - List expenses
router.get('/expenses', authenticateToken, checkFeature('accounting'), async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id;
  const { branch_id, category_id, start_date, end_date } = req.query;

  try {
    let query = `
      SELECT e.*, c.name as category_name, b.name as branch_name, u.name as recorder_name
      FROM expenses e
      LEFT JOIN expense_categories c ON e.category_id = c.id
      LEFT JOIN branches b ON e.branch_id = b.id
      LEFT JOIN users u ON e.recorded_by = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (labId) {
      params.push(labId);
      query += ` AND e.lab_id = $${params.length}`;
    }

    if (branch_id) {
      params.push(branch_id);
      query += ` AND e.branch_id = $${params.length}`;
    }

    if (category_id) {
      params.push(category_id);
      query += ` AND e.category_id = $${params.length}`;
    }

    if (start_date) {
      params.push(start_date);
      query += ` AND e.expense_date >= $${params.length}`;
    }

    if (end_date) {
      params.push(end_date);
      query += ` AND e.expense_date <= $${params.length}`;
    }

    query += ` ORDER BY e.expense_date DESC, e.created_at DESC LIMIT 100`;

    const expenses = await db.query(query, params);
    res.json(expenses);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/accounting/expenses - Record new expense
router.post('/expenses', authenticateToken, checkFeature('accounting'), async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id;
  if (!labId) {
    res.status(403).json({ error: 'Laboratory context required' });
    return;
  }

  const { branch_id, category_id, title, amount, payment_method, expense_date, payee, notes } = req.body;

  if (!title || !amount || Number(amount) <= 0) {
    res.status(400).json({ error: 'Title and positive amount are required' });
    return;
  }

  try {
    const expenseId = `exp-${uuidv4().substring(0, 8)}`;
    const numAmount = Number(amount);

    await db.execute(
      `INSERT INTO expenses (id, lab_id, branch_id, category_id, title, amount, payment_method, expense_date, payee, notes, recorded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, CURRENT_DATE), $9, $10, $11)`,
      [expenseId, labId, branch_id || null, category_id || null, title, numAmount, payment_method || 'Cash', expense_date || null, payee || null, notes || null, req.user?.id]
    );

    // Record in General Ledger (Debit expense)
    const ledgerId = `led-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO ledgers (id, lab_id, branch_id, entry_type, category, amount, reference_type, reference_id, description, recorded_by)
       VALUES ($1, $2, $3, 'debit', 'expense', $4, 'expense', $5, $6, $7)`,
      [ledgerId, labId, branch_id || null, numAmount, expenseId, `Expense: ${title} (${payee || 'Direct'})`, req.user?.id]
    );

    auditFromReq(req, 'CREATE_EXPENSE', 'expense', expenseId, null, { title, amount: numAmount, payment_method });

    res.status(201).json({ message: 'Expense recorded successfully', id: expenseId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/accounting/expense-categories
router.get('/expense-categories', authenticateToken, checkFeature('accounting'), async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id;
  try {
    const categories = await db.query(
      `SELECT c.*, (SELECT COUNT(*) FROM expenses WHERE category_id = c.id) as expense_count
       FROM expense_categories c
       WHERE c.lab_id = $1 OR c.lab_id = 'lab-apex'
       ORDER BY c.name ASC`,
      [labId || 'lab-apex']
    );
    res.json(categories);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/accounting/expense-categories
router.post('/expense-categories', authenticateToken, checkFeature('accounting'), async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id;
  if (!labId) {
    res.status(403).json({ error: 'Laboratory context required' });
    return;
  }
  const { name, description } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Category name is required' });
    return;
  }

  try {
    const id = `cat-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO expense_categories (id, lab_id, name, description) VALUES ($1, $2, $3, $4)`,
      [id, labId, name, description || null]
    );
    res.status(201).json({ message: 'Category created', id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/accounting/ledger - General Ledger
router.get('/ledger', authenticateToken, checkFeature('accounting'), async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id;
  const { branch_id, category, entry_type } = req.query;

  try {
    let query = `
      SELECT l.*, b.name as branch_name, u.name as recorder_name
      FROM ledgers l
      LEFT JOIN branches b ON l.branch_id = b.id
      LEFT JOIN users u ON l.recorded_by = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (labId) {
      params.push(labId);
      query += ` AND l.lab_id = $${params.length}`;
    }

    if (branch_id) {
      params.push(branch_id);
      query += ` AND l.branch_id = $${params.length}`;
    }

    if (category) {
      params.push(category);
      query += ` AND l.category = $${params.length}`;
    }

    if (entry_type) {
      params.push(entry_type);
      query += ` AND l.entry_type = $${params.length}`;
    }

    query += ` ORDER BY l.created_at DESC LIMIT 150`;

    const ledger = await db.query(query, params);
    res.json(ledger);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/accounting/receivables - Accounts Receivable Aging
router.get('/receivables', authenticateToken, checkFeature('accounting'), async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id;
  const { branch_id } = req.query;

  try {
    let query = `
      SELECT i.id as invoice_id, i.invoice_number, i.net_total, i.paid, i.due, i.created_at,
             o.order_number, pt.id as patient_id, pt.name as patient_name, pt.mobile as patient_mobile,
             b.name as branch_name,
             CAST((julianday('now') - julianday(i.created_at)) AS INTEGER) as days_overdue
      FROM invoices i
      JOIN test_orders o ON i.order_id = o.id
      JOIN patients pt ON o.patient_id = pt.id
      LEFT JOIN branches b ON i.branch_id = b.id
      WHERE i.due > 0
    `;
    const params: any[] = [];

    if (labId) {
      params.push(labId);
      query += ` AND i.lab_id = $${params.length}`;
    }

    if (branch_id) {
      params.push(branch_id);
      query += ` AND i.branch_id = $${params.length}`;
    }

    query += ` ORDER BY i.due DESC LIMIT 100`;

    const receivables = await db.query(query, params);

    // Aging breakdown
    let bucket0to30 = 0;
    let bucket31to60 = 0;
    let bucket61to90 = 0;
    let bucket90Plus = 0;

    receivables.forEach((r: any) => {
      const days = Number(r.days_overdue || 0);
      const due = Number(r.due || 0);
      if (days <= 30) bucket0to30 += due;
      else if (days <= 60) bucket31to60 += due;
      else if (days <= 90) bucket61to90 += due;
      else bucket90Plus += due;
    });

    res.json({
      receivables,
      aging_summary: {
        bucket_0_30: bucket0to30,
        bucket_31_60: bucket31to60,
        bucket_61_90: bucket61to90,
        bucket_90_plus: bucket90Plus,
        total_due: bucket0to30 + bucket31to60 + bucket61to90 + bucket90Plus
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/accounting/cash-closing - Shift cash drawer closings
router.get('/cash-closing', authenticateToken, checkFeature('accounting'), async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id;
  const { branch_id } = req.query;

  try {
    let query = `
      SELECT cc.*, b.name as branch_name, u_cl.name as closer_name, u_vr.name as verifier_name
      FROM cash_closings cc
      LEFT JOIN branches b ON cc.branch_id = b.id
      LEFT JOIN users u_cl ON cc.closed_by = u_cl.id
      LEFT JOIN users u_vr ON cc.verified_by = u_vr.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (labId) {
      params.push(labId);
      query += ` AND cc.lab_id = $${params.length}`;
    }

    if (branch_id) {
      params.push(branch_id);
      query += ` AND cc.branch_id = $${params.length}`;
    }

    query += ` ORDER BY cc.created_at DESC LIMIT 50`;

    const closings = await db.query(query, params);
    res.json(closings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/accounting/cash-closing - Perform cash drawer closing
router.post('/cash-closing', authenticateToken, checkFeature('accounting'), async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id;
  if (!labId) {
    res.status(403).json({ error: 'Laboratory context required' });
    return;
  }

  const { branch_id, shift_date, opening_cash, actual_cash, remarks } = req.body;
  if (!branch_id || actual_cash === undefined) {
    res.status(400).json({ error: 'Branch and actual cash count are required' });
    return;
  }

  try {
    const sDate = shift_date || new Date().toISOString().split('T')[0];

    // Compute cash sales today for this branch
    const cashSalesRes = await db.queryOne<{ total: number }>(
      `SELECT COALESCE(SUM(p.amount), 0) as total
       FROM payments p
       JOIN invoices i ON p.invoice_id = i.id
       WHERE i.lab_id = $1 AND i.branch_id = $2 AND p.payment_method = 'Cash' AND DATE(p.created_at) = $3`,
      [labId, branch_id, sDate]
    );

    // Compute cash expenses today for this branch
    const cashExpRes = await db.queryOne<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM expenses
       WHERE lab_id = $1 AND branch_id = $2 AND payment_method = 'Cash' AND expense_date = $3`,
      [labId, branch_id, sDate]
    );

    // Compute cash refunds paid
    const cashRefundsRes = await db.queryOne<{ total: number }>(
      `SELECT COALESCE(SUM(r.amount), 0) as total
       FROM refunds r
       JOIN payments p ON r.payment_id = p.id
       JOIN invoices i ON p.invoice_id = i.id
       WHERE i.lab_id = $1 AND i.branch_id = $2 AND p.payment_method = 'Cash' AND DATE(r.created_at) = $3`,
      [labId, branch_id, sDate]
    );

    const openCash = Number(opening_cash || 0);
    const cashSales = Number(cashSalesRes?.total || 0);
    const cashExp = Number(cashExpRes?.total || 0);
    const cashRef = Number(cashRefundsRes?.total || 0);
    const calculatedCash = openCash + cashSales - cashExp - cashRef;
    const actualCash = Number(actual_cash);
    const variance = actualCash - calculatedCash;

    const closingId = `cc-${uuidv4().substring(0, 8)}`;

    await db.execute(
      `INSERT INTO cash_closings (id, lab_id, branch_id, shift_date, opening_cash, cash_sales, cash_expenses, refunds_paid, calculated_cash, actual_cash, variance, closed_by, status, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'closed', $13)`,
      [closingId, labId, branch_id, sDate, openCash, cashSales, cashExp, cashRef, calculatedCash, actualCash, variance, req.user?.id, remarks || null]
    );

    auditFromReq(req, 'CASH_CLOSING', 'cash_closing', closingId, null, { shift_date: sDate, calculatedCash, actualCash, variance });

    res.status(201).json({
      message: 'Cash drawer closing reconciled successfully',
      id: closingId,
      calculated_cash: calculatedCash,
      actual_cash: actualCash,
      variance
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/accounting/tax-summary - GST/Tax Summary
router.get('/tax-summary', authenticateToken, checkFeature('accounting'), async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id;
  try {
    const summary = await db.query(
      `SELECT strftime('%Y-%m', created_at) as month,
              COUNT(*) as invoice_count,
              SUM(subtotal) as gross_subtotal,
              SUM(discount) as total_discounts,
              SUM(tax) as total_tax_collected,
              SUM(net_total) as net_billed
       FROM invoices
       ${labId ? `WHERE lab_id = '${labId}'` : ''}
       GROUP BY strftime('%Y-%m', created_at)
       ORDER BY month DESC LIMIT 12`
    );
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
