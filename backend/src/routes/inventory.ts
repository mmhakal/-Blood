import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { auditFromReq } from '../services/auditService';
import { checkFeature } from '../middleware/featureGate';

const router = Router();

// GET /api/inventory/dashboard - Overview KPIs & Health
router.get('/dashboard', authenticateToken, checkFeature('inventory'), async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id;

  try {
    let labFilter = '';
    if (labId) labFilter = `WHERE lab_id = '${labId}'`;

    // 1. Total items count
    const countRes = await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM inventory_items ${labFilter}`);

    // 2. Valuation
    const valRes = await db.queryOne<{ val: number }>(
      `SELECT COALESCE(SUM(current_stock * purchase_price), 0) as val FROM inventory_items ${labFilter}`
    );

    // 3. Low stock count
    const lowRes = await db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM inventory_items WHERE current_stock <= min_stock ${labId ? `AND lab_id = '${labId}'` : ''}`
    );

    // 4. Expiring in next 30 days
    const expRes = await db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM inventory_batches
       WHERE current_quantity > 0 AND expiry_date <= date('now', '+30 days')
       ${labId ? `AND lab_id = '${labId}'` : ''}`
    );

    // 5. Recent transactions
    const recentTx = await db.query(
      `SELECT st.*, i.name as item_name, i.code as item_code, u.name as performer_name
       FROM stock_transactions st
       JOIN inventory_items i ON st.item_id = i.id
       LEFT JOIN users u ON st.performed_by = u.id
       ${labId ? `WHERE st.lab_id = '${labId}'` : ''}
       ORDER BY st.created_at DESC LIMIT 6`
    );

    res.json({
      total_items: Number(countRes?.count || 0),
      stock_valuation: Number(valRes?.val || 0),
      low_stock_count: Number(lowRes?.count || 0),
      expiring_soon_count: Number(expRes?.count || 0),
      recent_transactions: recentTx
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/items - List item master
router.get('/items', authenticateToken, checkFeature('inventory'), async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id;
  const { category_id, search, low_stock } = req.query;

  try {
    let query = `
      SELECT i.*, c.name as category_name, s.name as supplier_name,
             (i.current_stock <= i.min_stock) as is_low_stock
      FROM inventory_items i
      LEFT JOIN inventory_categories c ON i.category_id = c.id
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (labId) {
      params.push(labId);
      query += ` AND i.lab_id = $${params.length}`;
    }

    if (category_id) {
      params.push(category_id);
      query += ` AND i.category_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${String(search).toLowerCase()}%`);
      const idx = params.length;
      query += ` AND (LOWER(i.name) LIKE $${idx} OR LOWER(i.code) LIKE $${idx})`;
    }

    if (low_stock === 'true') {
      query += ` AND i.current_stock <= i.min_stock`;
    }

    query += ` ORDER BY i.name ASC LIMIT 100`;

    const items = await db.query(query, params);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventory/items - Create inventory item
router.post('/items', authenticateToken, checkFeature('inventory'), async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id;
  if (!labId) {
    res.status(403).json({ error: 'Laboratory context required' });
    return;
  }

  const { category_id, supplier_id, code, name, unit, min_stock, max_stock, purchase_price, selling_cost, storage_temp, location } = req.body;

  if (!code || !name || !unit) {
    res.status(400).json({ error: 'Item code, name, and unit of measurement are required' });
    return;
  }

  try {
    const id = `item-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO inventory_items (id, lab_id, category_id, supplier_id, code, name, unit, min_stock, max_stock, purchase_price, selling_cost, storage_temp, location)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [id, labId, category_id || null, supplier_id || null, code, name, unit, Number(min_stock || 10), Number(max_stock || 500), Number(purchase_price || 0), Number(selling_cost || 0), storage_temp || null, location || null]
    );

    auditFromReq(req, 'CREATE_INVENTORY_ITEM', 'inventory_item', id, null, { code, name, unit });
    res.status(201).json({ message: 'Item created successfully', id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/categories
router.get('/categories', authenticateToken, checkFeature('inventory'), async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id;
  try {
    const cats = await db.query(
      `SELECT c.*, (SELECT COUNT(*) FROM inventory_items WHERE category_id = c.id) as item_count
       FROM inventory_categories c
       WHERE c.lab_id = $1 OR c.lab_id = 'lab-apex'
       ORDER BY c.name ASC`,
      [labId || 'lab-apex']
    );
    res.json(cats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventory/categories
router.post('/categories', authenticateToken, checkFeature('inventory'), async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id;
  if (!labId) {
    res.status(403).json({ error: 'Laboratory context required' });
    return;
  }
  const { name, description } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Name required' });
    return;
  }

  try {
    const id = `icat-${uuidv4().substring(0, 8)}`;
    await db.execute(`INSERT INTO inventory_categories (id, lab_id, name, description) VALUES ($1, $2, $3, $4)`, [id, labId, name, description || null]);
    res.status(201).json({ message: 'Category created', id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/suppliers
router.get('/suppliers', authenticateToken, checkFeature('inventory'), async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id;
  try {
    const suppliers = await db.query(
      `SELECT * FROM suppliers WHERE lab_id = $1 OR lab_id = 'lab-apex' ORDER BY name ASC`,
      [labId || 'lab-apex']
    );
    res.json(suppliers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventory/suppliers
router.post('/suppliers', authenticateToken, checkFeature('inventory'), async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id;
  if (!labId) {
    res.status(403).json({ error: 'Laboratory context required' });
    return;
  }
  const { name, contact_person, email, phone, address, gst_number, payment_terms } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Supplier name required' });
    return;
  }

  try {
    const id = `sup-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO suppliers (id, lab_id, name, contact_person, email, phone, address, gst_number, payment_terms)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, labId, name, contact_person || null, email || null, phone || null, address || null, gst_number || null, payment_terms || 'Net 30']
    );
    res.status(201).json({ message: 'Supplier registered', id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/batches - List active batches
router.get('/batches', authenticateToken, checkFeature('inventory'), async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id;
  const { item_id } = req.query;

  try {
    let query = `
      SELECT b.*, i.name as item_name, i.code as item_code,
             (b.expiry_date <= date('now')) as is_expired,
             CAST((julianday(b.expiry_date) - julianday('now')) AS INTEGER) as days_to_expiry
      FROM inventory_batches b
      JOIN inventory_items i ON b.item_id = i.id
      WHERE b.current_quantity > 0
    `;
    const params: any[] = [];

    if (labId) {
      params.push(labId);
      query += ` AND b.lab_id = $${params.length}`;
    }

    if (item_id) {
      params.push(item_id);
      query += ` AND b.item_id = $${params.length}`;
    }

    query += ` ORDER BY b.expiry_date ASC LIMIT 100`;

    const batches = await db.query(query, params);
    res.json(batches);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventory/stock-in - Stock-in / Purchase Entry
router.post('/stock-in', authenticateToken, checkFeature('inventory'), async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id;
  if (!labId) {
    res.status(403).json({ error: 'Laboratory context required' });
    return;
  }

  const { item_id, batch_number, expiry_date, quantity, unit_cost, supplier_id, notes } = req.body;

  if (!item_id || !batch_number || !expiry_date || !quantity || Number(quantity) <= 0) {
    res.status(400).json({ error: 'Item, batch number, expiry date, and positive quantity are required' });
    return;
  }

  try {
    const qty = Number(quantity);
    const uCost = Number(unit_cost || 0);
    const totalCost = qty * uCost;

    // 1. Create batch record
    const batchId = `bat-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO inventory_batches (id, lab_id, item_id, batch_number, expiry_date, initial_quantity, current_quantity, unit_cost, supplier_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [batchId, labId, item_id, batch_number, expiry_date, qty, qty, uCost, supplier_id || null]
    );

    // 2. Update item stock
    await db.execute(
      `UPDATE inventory_items
       SET current_stock = current_stock + $1,
           purchase_price = CASE WHEN $2 > 0 THEN $2 ELSE purchase_price END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [qty, uCost, item_id]
    );

    // 3. Record stock transaction
    const txId = `stx-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO stock_transactions (id, lab_id, item_id, batch_id, transaction_type, quantity, unit_cost, total_cost, reference_type, reason, performed_by)
       VALUES ($1, $2, $3, $4, 'stock_in', $5, $6, $7, 'purchase_entry', $8, $9)`,
      [txId, labId, item_id, batchId, qty, uCost, totalCost, notes || `Stock-in batch ${batch_number}`, req.user?.id]
    );

    auditFromReq(req, 'STOCK_IN', 'inventory_batch', batchId, null, { item_id, batch_number, quantity: qty, unit_cost: uCost });

    res.status(201).json({ message: 'Stock received and inventory batch registered successfully', batch_id: batchId, transaction_id: txId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventory/adjustment - Stock adjustment (consumption, damaged, expired)
router.post('/adjustment', authenticateToken, checkFeature('inventory'), async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id;
  if (!labId) {
    res.status(403).json({ error: 'Laboratory context required' });
    return;
  }

  const { item_id, batch_id, adjustment_type, quantity, reason } = req.body;

  if (!item_id || !adjustment_type || !quantity || Number(quantity) <= 0 || !reason) {
    res.status(400).json({ error: 'Item, adjustment type, positive quantity, and mandatory reason are required' });
    return;
  }

  try {
    const qty = Number(quantity);

    // Deduct from item
    await db.execute(
      `UPDATE inventory_items
       SET current_stock = MAX(0, current_stock - $1),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [qty, item_id]
    );

    // If batch specified, deduct from batch
    if (batch_id) {
      await db.execute(
        `UPDATE inventory_batches
         SET current_quantity = MAX(0, current_quantity - $1),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [qty, batch_id]
      );
    }

    const txId = `stx-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO stock_transactions (id, lab_id, item_id, batch_id, transaction_type, quantity, reason, performed_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [txId, labId, item_id, batch_id || null, adjustment_type, -qty, reason, req.user?.id]
    );

    auditFromReq(req, 'STOCK_ADJUSTMENT', 'inventory_item', item_id, null, { adjustment_type, quantity: qty, reason });

    res.json({ message: `Stock adjusted successfully (${adjustment_type})`, transaction_id: txId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/transfers - Branch transfers
router.get('/transfers', authenticateToken, checkFeature('inventory'), async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id;
  try {
    const transfers = await db.query(
      `SELECT st.*, i.name as item_name, i.code as item_code,
              fb.name as from_branch_name, tb.name as to_branch_name
       FROM stock_transfers st
       JOIN inventory_items i ON st.item_id = i.id
       JOIN branches fb ON st.from_branch_id = fb.id
       JOIN branches tb ON st.to_branch_id = tb.id
       ${labId ? `WHERE st.lab_id = '${labId}'` : ''}
       ORDER BY st.created_at DESC LIMIT 50`
    );
    res.json(transfers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventory/transfers - Create transfer request
router.post('/transfers', authenticateToken, checkFeature('inventory'), async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id;
  if (!labId) {
    res.status(403).json({ error: 'Laboratory context required' });
    return;
  }

  const { from_branch_id, to_branch_id, item_id, batch_id, quantity, notes } = req.body;
  if (!from_branch_id || !to_branch_id || !item_id || !quantity || Number(quantity) <= 0) {
    res.status(400).json({ error: 'Source branch, destination branch, item, and quantity are required' });
    return;
  }

  try {
    const transferId = `trf-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO stock_transfers (id, lab_id, from_branch_id, to_branch_id, item_id, batch_id, quantity, status, requested_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'dispatched', $8, $9)`,
      [transferId, labId, from_branch_id, to_branch_id, item_id, batch_id || null, Number(quantity), req.user?.id, notes || null]
    );

    auditFromReq(req, 'STOCK_TRANSFER', 'stock_transfer', transferId, null, { from_branch_id, to_branch_id, item_id, quantity });

    res.status(201).json({ message: 'Stock transfer dispatched to destination branch', id: transferId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/inventory/transfers/:id/receive - Acknowledge receipt
router.post('/transfers/:id/receive', authenticateToken, checkFeature('inventory'), async (req: AuthRequest, res: Response) => {
  const transferId = req.params.id;
  try {
    await db.execute(
      `UPDATE stock_transfers
       SET status = 'received', received_by = $1, receipt_date = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [req.user?.id, transferId]
    );
    res.json({ message: 'Stock transfer acknowledged and added to branch stock' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/alerts/low-stock
router.get('/alerts/low-stock', authenticateToken, checkFeature('inventory'), async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id;
  try {
    const lowStock = await db.query(
      `SELECT i.*, c.name as category_name
       FROM inventory_items i
       LEFT JOIN inventory_categories c ON i.category_id = c.id
       WHERE i.current_stock <= i.min_stock
       ${labId ? `AND i.lab_id = '${labId}'` : ''}
       ORDER BY (i.min_stock - i.current_stock) DESC`
    );
    res.json(lowStock);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/alerts/expiry
router.get('/alerts/expiry', authenticateToken, checkFeature('inventory'), async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id;
  try {
    const expiring = await db.query(
      `SELECT b.*, i.name as item_name, i.code as item_code,
              CAST((julianday(b.expiry_date) - julianday('now')) AS INTEGER) as days_to_expiry
       FROM inventory_batches b
       JOIN inventory_items i ON b.item_id = i.id
       WHERE b.current_quantity > 0 AND b.expiry_date <= date('now', '+60 days')
       ${labId ? `AND b.lab_id = '${labId}'` : ''}
       ORDER BY b.expiry_date ASC`
    );
    res.json(expiring);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
