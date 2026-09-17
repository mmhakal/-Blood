import { Router, Response } from 'express';
import db from '../db/database';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireTenant } from '../middleware/tenant';
import { requireRoles } from '../middleware/rbac';
import ProcurementService from '../services/procurementService';
import { auditFromReq } from '../services/auditService';

const router = Router();

const resolveLabId = (req: AuthRequest): string => {
  return req.user?.lab_id || (req.query.lab_id as string) || (req.headers['x-lab-id'] as string) || 'lab-apex';
};

// GET /api/procurement/suppliers - List suppliers
router.get('/suppliers', authenticateToken, requireTenant, async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);

  try {
    const suppliers = await db.query<any>(
      `SELECT * FROM suppliers WHERE lab_id = $1 ORDER BY company_name ASC`,
      [labId]
    );
    res.json(suppliers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/procurement/suppliers - Register supplier
router.post('/suppliers', authenticateToken, requireTenant, requireRoles(['super_admin', 'lab_admin', 'accountant']), async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);
  const { company_name, contact_person, email, phone, address, city, state, tax_number, payment_terms } = req.body;

  if (!company_name) {
    res.status(400).json({ error: 'Company name is required' });
    return;
  }

  try {
    const id = `sup-${uuidv4().substring(0, 8)}`;
    const code = `SUP-${Math.floor(100 + Math.random() * 900)}`;

    await db.execute(
      `INSERT INTO suppliers (id, lab_id, supplier_code, name, company_name, contact_person, email, phone, address, city, state, tax_number, payment_terms, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'active')`,
      [
        id,
        labId,
        code,
        company_name,
        company_name,
        contact_person || null,
        email || null,
        phone || null,
        address || null,
        city || null,
        state || null,
        tax_number || null,
        payment_terms || 'net_30',
      ]
    );

    auditFromReq(req, 'CREATE_SUPPLIER', 'supplier', id, null, { company_name });
    const supplier = await db.queryOne(`SELECT * FROM suppliers WHERE id = $1`, [id]);
    res.status(201).json(supplier);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/procurement/purchase-orders - List POs
router.get('/purchase-orders', authenticateToken, requireTenant, async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);

  try {
    const pos = await db.query<any>(
      `SELECT po.*, 
              COALESCE(po.approval_status, 'draft') as status,
              COALESCE(po.po_date, po.created_at) as order_date,
              COALESCE(po.total_amount, 0) as grand_total,
              s.company_name as supplier_name, s.supplier_code
       FROM purchase_orders po
       LEFT JOIN suppliers s ON po.supplier_id = s.id
       WHERE po.lab_id = $1
       ORDER BY po.created_at DESC`,
      [labId]
    );
    res.json(pos);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/procurement/purchase-orders/:id - Get PO details
router.get('/purchase-orders/:id', authenticateToken, requireTenant, async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);

  try {
    const po = await ProcurementService.getPurchaseOrder(req.params.id as string, labId!);
    if (!po) {
      res.status(404).json({ error: 'Purchase Order not found' });
      return;
    }
    res.json(po);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/procurement/purchase-orders - Create PO
router.post('/purchase-orders', authenticateToken, requireTenant, async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);

  if (!req.body.supplier_id || !req.body.items || req.body.items.length === 0) {
    res.status(400).json({ error: 'Supplier and items are required for Purchase Order' });
    return;
  }

  try {
    const po = await ProcurementService.createPurchaseOrder(labId!, req.body, req.user?.id || 'system');
    auditFromReq(req, 'CREATE_PURCHASE_ORDER', 'purchase_order', po?.id, null, { po_number: po?.po_number });
    res.status(201).json(po);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/procurement/goods-receipts - Process GRN with inventory auto-sync
router.post('/goods-receipts', authenticateToken, requireTenant, async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);
  const items = req.body.items || req.body.received_items;

  if (!req.body.po_id || !req.body.supplier_id || !items || items.length === 0) {
    res.status(400).json({ error: 'PO reference, supplier, and items are required for GRN' });
    return;
  }

  req.body.items = items;

  try {
    const grn = await ProcurementService.processGoodsReceipt(labId!, req.body, req.user?.id || 'system');
    auditFromReq(req, 'PROCESS_GOODS_RECEIPT', 'goods_receipt', grn.grn_id, null, { grn_number: grn.grn_number });
    res.status(201).json(grn);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/procurement/goods-receipts - List GRNs
router.get('/goods-receipts', authenticateToken, requireTenant, async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);

  try {
    const grns = await db.query<any>(
      `SELECT grn.*, 
              COALESCE(grn.receipt_date, grn.created_at) as received_date,
              COALESCE(grn.status, 'matched') as three_way_match_status,
              po.po_number, s.company_name as supplier_name
       FROM goods_receipts grn
       LEFT JOIN purchase_orders po ON grn.po_id = po.id
       LEFT JOIN suppliers s ON grn.supplier_id = s.id
       WHERE grn.lab_id = $1
       ORDER BY grn.created_at DESC`,
      [labId]
    );
    res.json(grns);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/procurement/contracts - List contracts
router.get('/contracts', authenticateToken, requireTenant, async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);

  try {
    const contracts = await db.query<any>(
      `SELECT * FROM supplier_contracts WHERE lab_id = $1 ORDER BY end_date ASC`,
      [labId]
    );
    res.json(contracts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
