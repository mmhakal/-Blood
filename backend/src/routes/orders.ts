import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { auditFromReq } from '../services/auditService';

const router = Router();

// GET /api/orders - list test orders
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const labId = req.user?.lab_id;
    const branchId = req.query.branch_id as string || req.user?.branch_id;
    const status = req.query.status as string;
    const priority = req.query.priority as string;
    const search = req.query.search as string;

    let query = `
      SELECT o.*,
             p.name as patient_name, p.patient_id_code, p.mobile as patient_mobile, p.age, p.gender,
             d.name as doctor_name,
             b.name as branch_name,
             u.name as creator_name,
             (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count,
             (SELECT report_number FROM reports WHERE order_id = o.id LIMIT 1) as report_number,
             (SELECT status FROM reports WHERE order_id = o.id LIMIT 1) as report_status,
             (SELECT id FROM reports WHERE order_id = o.id LIMIT 1) as report_id
      FROM test_orders o
      JOIN patients p ON o.patient_id = p.id
      LEFT JOIN doctors d ON o.referring_doctor_id = d.id
      LEFT JOIN branches b ON o.branch_id = b.id
      LEFT JOIN users u ON o.created_by = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (labId) {
      params.push(labId);
      query += ` AND o.lab_id = $${params.length}`;
    }

    if (branchId) {
      params.push(branchId);
      query += ` AND o.branch_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND o.status = $${params.length}`;
    }

    if (priority) {
      params.push(priority);
      query += ` AND o.priority = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const idx = params.length;
      query += ` AND (LOWER(p.name) LIKE $${idx} OR o.order_number LIKE $${idx} OR o.lab_number LIKE $${idx} OR p.patient_id_code LIKE $${idx})`;
    }

    query += ` ORDER BY o.created_at DESC LIMIT 100`;

    const orders = await db.query(query, params);
    res.json(orders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/:id - get order details with items, samples, invoice, and report
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const orderId = req.params.id;
    const order = await db.queryOne(
      `SELECT o.*,
              p.name as patient_name, p.patient_id_code, p.mobile as patient_mobile, p.age, p.gender, p.address as patient_address,
              d.name as doctor_name, d.qualification as doctor_qualification,
              b.name as branch_name, b.address as branch_address
       FROM test_orders o
       JOIN patients p ON o.patient_id = p.id
       LEFT JOIN doctors d ON o.referring_doctor_id = d.id
       LEFT JOIN branches b ON o.branch_id = b.id
       WHERE o.id = $1`,
      [orderId]
    );

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    // Tenant isolation
    if (req.user?.lab_id && order.lab_id !== req.user.lab_id) {
      res.status(403).json({ error: 'Access denied: Cannot access order from another laboratory' });
      return;
    }

    const items = await db.query(
      `SELECT oi.*, t.code as test_code, t.sample_type, t.container_type
       FROM order_items oi
       LEFT JOIN tests t ON oi.test_id = t.id
       WHERE oi.order_id = $1`,
      [orderId]
    );

    const samples = await db.query(
      `SELECT s.*, u.name as collector_name
       FROM samples s
       LEFT JOIN users u ON s.collected_by = u.id
       WHERE s.order_id = $1`,
      [orderId]
    );

    const invoice = await db.queryOne(
      `SELECT i.* FROM invoices i WHERE i.order_id = $1`,
      [orderId]
    );

    let payments: any[] = [];
    if (invoice) {
      payments = await db.query(
        `SELECT p.*, u.name as received_by_name
         FROM payments p
         LEFT JOIN users u ON p.received_by = u.id
         WHERE p.invoice_id = $1
         ORDER BY p.created_at DESC`,
        [invoice.id]
      );
    }

    const report = await db.queryOne(
      `SELECT r.*, u.name as approver_name
       FROM reports r
       LEFT JOIN users u ON r.approved_by = u.id
       WHERE r.order_id = $1`,
      [orderId]
    );

    res.json({ order, items, samples, invoice, payments, report });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders - create test order with tests/packages, priority, barcodes, invoices, and payments
router.post('/', authenticateToken, requirePermission('create_order'), async (req: AuthRequest, res: Response) => {
  const {
    patient_id, referring_doctor_id, items, discount_amount, tax_percent, paid_amount,
    payment_method, clinical_history, remarks, priority, discount_reason
  } = req.body;
  const labId = req.user?.lab_id;
  const branchId = req.body.branch_id || req.user?.branch_id;

  if (!patient_id || !items || !Array.isArray(items) || items.length === 0 || !labId) {
    res.status(400).json({ error: 'Patient ID and test items are required' });
    return;
  }

  try {
    const orderId = `ord-${uuidv4().substring(0, 8)}`;
    const year = new Date().getFullYear();

    // 6-digit zero-padded sequence for Order number and Lab number
    const orderCountRes = await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM test_orders WHERE lab_id = $1`, [labId]);
    const nextSeq = (parseInt(orderCountRes?.count as any || '0') + 1).toString().padStart(6, '0');
    const orderNumber = `ORD-${year}-${nextSeq}`;
    const labNumber = `LAB-${year}-${nextSeq}`;

    // Calculate item pricing
    let subtotal = 0;
    const resolvedItems: Array<{ id: string; test_id?: string; package_id?: string; name: string; price: number; sample_type: string; container_type: string }> = [];

    for (const it of items) {
      if (it.test_id) {
        const test = await db.queryOne(`SELECT * FROM tests WHERE id = $1`, [it.test_id]);
        if (test) {
          const price = parseFloat(it.price !== undefined ? it.price : test.base_price);
          subtotal += price;
          resolvedItems.push({
            id: `item-${uuidv4().substring(0, 8)}`,
            test_id: test.id,
            name: test.name,
            price: price,
            sample_type: test.sample_type || 'Whole Blood (EDTA)',
            container_type: test.container_type || 'Lavender Top'
          });
        }
      } else if (it.package_id) {
        const pkg = await db.queryOne(`SELECT * FROM packages WHERE id = $1`, [it.package_id]);
        if (pkg) {
          const price = parseFloat(it.price !== undefined ? it.price : pkg.price);
          subtotal += price;
          resolvedItems.push({
            id: `item-${uuidv4().substring(0, 8)}`,
            package_id: pkg.id,
            name: pkg.name,
            price: price,
            sample_type: 'Multiple Specimens',
            container_type: 'Multiple Tubes'
          });

          // Also link individual tests of the package
          const pkgTests = await db.query(`SELECT t.* FROM tests t JOIN package_tests pt ON t.id = pt.test_id WHERE pt.package_id = $1`, [pkg.id]);
          for (const pt of pkgTests) {
            resolvedItems.push({
              id: `item-${uuidv4().substring(0, 8)}`,
              test_id: pt.id,
              name: `${pt.name} (Pkg: ${pkg.name})`,
              price: 0,
              sample_type: pt.sample_type || 'Whole Blood (EDTA)',
              container_type: pt.container_type || 'Lavender Top'
            });
          }
        }
      }
    }

    const discount = parseFloat(discount_amount || 0);

    // Enforce role-based discount permissions
    const userRole = req.user?.role_code;
    if (discount > 0 && subtotal > 0) {
      const discountPercent = (discount / subtotal) * 100;
      if (userRole === 'receptionist') {
        if (discountPercent > 10.01 || discount > 500) {
          res.status(403).json({
            error: `Discount of ₹${discount} (${discountPercent.toFixed(1)}%) exceeds authorized limit for Receptionist role (max 10% or ₹500). Please request Lab Admin approval.`
          });
          return;
        }
      } else if (userRole === 'lab_admin') {
        if (discountPercent > 50.01 || discount > 5000) {
          res.status(403).json({
            error: `Discount of ₹${discount} (${discountPercent.toFixed(1)}%) exceeds authorized limit for Lab Admin role (max 50% or ₹5,000).`
          });
          return;
        }
      }
    }

    const taxRate = parseFloat(tax_percent || 0);
    const taxable = Math.max(0, subtotal - discount);
    const tax = Math.round((taxable * taxRate / 100) * 100) / 100;
    const netTotal = Math.round((taxable + tax) * 100) / 100;
    const paid = Math.min(netTotal, Math.max(0, parseFloat(paid_amount || 0)));
    const due = Math.max(0, Math.round((netTotal - paid) * 100) / 100);
    const paymentStatus = due === 0 && netTotal > 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid';
    const orderPriority = priority || 'routine';

    // 1. Insert Order
    await db.execute(
      `INSERT INTO test_orders (id, lab_id, branch_id, order_number, lab_number, patient_id, referring_doctor_id, status, priority, total_amount, discount_amount, tax_amount, net_amount, paid_amount, due_amount, payment_status, clinical_history, remarks, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'registered', $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      [
        orderId, labId, branchId || null, orderNumber, labNumber, patient_id, referring_doctor_id || null,
        orderPriority, subtotal, discount, tax, netTotal, paid, due, paymentStatus, clinical_history || '', remarks || '',
        req.user?.id || null
      ]
    );

    // 2. Insert Order Items
    for (const item of resolvedItems) {
      await db.execute(
        `INSERT INTO order_items (id, order_id, test_id, package_id, item_name, price, discount, net_price, status)
         VALUES ($1, $2, $3, $4, $5, $6, 0, $6, 'pending')`,
        [item.id, orderId, item.test_id || null, item.package_id || null, item.name, item.price]
      );
    }

    // 3. Create Sample records grouped by sample type
    const sampleTypeMap: Record<string, { container: string }> = {};
    for (const it of resolvedItems) {
      if (it.test_id && it.sample_type) {
        sampleTypeMap[it.sample_type] = { container: it.container_type };
      }
    }

    const sampleCountRes = await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM samples WHERE lab_id = $1`, [labId]);
    let currentSampleSeq = parseInt(sampleCountRes?.count as any || '0');
    const createdSamples: any[] = [];

    for (const [st, meta] of Object.entries(sampleTypeMap)) {
      currentSampleSeq++;
      const sampleId = `smp-${uuidv4().substring(0, 8)}`;
      const barcode = `SMP-${year}-${currentSampleSeq.toString().padStart(6, '0')}`;
      await db.execute(
        `INSERT INTO samples (id, lab_id, branch_id, order_id, sample_barcode, sample_type, container_type, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
        [sampleId, labId, branchId || null, orderId, barcode, st, meta.container]
      );
      createdSamples.push({ id: sampleId, barcode, sample_type: st, container: meta.container });
    }

    // 4. Create Invoice & Invoice Items
    const invoiceId = `inv-${uuidv4().substring(0, 8)}`;
    const invoiceNumber = `INV-${year}-${nextSeq}`;
    await db.execute(
      `INSERT INTO invoices (id, lab_id, branch_id, order_id, invoice_number, subtotal, discount, tax, net_total, paid, due, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [invoiceId, labId, branchId || null, orderId, invoiceNumber, subtotal, discount, tax, netTotal, paid, due, paymentStatus]
    );

    for (const item of resolvedItems) {
      await db.execute(
        `INSERT INTO invoice_items (id, invoice_id, item_type, item_id, item_name, quantity, unit_price, discount, tax, total)
         VALUES ($1, $2, $3, $4, $5, 1, $6, 0, 0, $6)`,
        [`ii-${uuidv4().substring(0, 8)}`, invoiceId, item.test_id ? 'test' : 'package', item.test_id || item.package_id, item.name, item.price]
      );
    }

    // 5. Record Discount record if discount applied
    if (discount > 0) {
      await db.execute(
        `INSERT INTO discounts (id, lab_id, order_id, invoice_id, discount_type, discount_value, discount_amount, reason, authorized_by, role_code)
         VALUES ($1, $2, $3, $4, 'fixed', $5, $6, $7, $8, $9)`,
        [`disc-${uuidv4().substring(0, 8)}`, labId, orderId, invoiceId, discount, discount, discount_reason || 'Authorized discount', req.user?.id || null, userRole || 'staff']
      );
      auditFromReq(req, 'APPLY_DISCOUNT', 'test_order', orderId, null, { discount, userRole, reason: discount_reason });
    }

    // 6. If initial payment provided, record Payment receipt
    let receiptNumber = null;
    if (paid > 0) {
      const paymentId = `pay-${uuidv4().substring(0, 8)}`;
      receiptNumber = `REC-${year}-${nextSeq}`;
      await db.execute(
        `INSERT INTO payments (id, invoice_id, receipt_number, amount, payment_method, notes, received_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [paymentId, invoiceId, receiptNumber, paid, payment_method || 'Cash', 'Initial payment on order booking', req.user?.id || null]
      );
    }

    // 7. Pre-create Draft Report record
    const reportId = `rep-${uuidv4().substring(0, 8)}`;
    const reportNumber = `RPT-${year}-${nextSeq}`;
    await db.execute(
      `INSERT INTO reports (id, lab_id, branch_id, order_id, report_number, status, qr_code_data)
       VALUES ($1, $2, $3, $4, $5, 'draft', $6)`,
      [reportId, labId, branchId || null, orderId, reportNumber, `https://apexlabs.com/verify/${reportNumber}`]
    );

    auditFromReq(req, 'CREATE_ORDER', 'test_order', orderId, null, { orderNumber, patient_id, netTotal, priority: orderPriority });

    res.status(201).json({
      message: 'Test order booked successfully',
      order_id: orderId,
      order_number: orderNumber,
      lab_number: labNumber,
      invoice_id: invoiceId,
      invoice_number: invoiceNumber,
      receipt_number: receiptNumber,
      report_id: reportId,
      report_number: reportNumber,
      samples: createdSamples
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders/:id/cancel - cancel test order with permission
router.post('/:id/cancel', authenticateToken, async (req: AuthRequest, res: Response) => {
  const orderId = req.params.id;
  const { reason } = req.body;
  const userRole = req.user?.role_code;
  const userPerms = req.user?.permissions || [];

  // Check permission: cancel_order or manage_lab or super_admin
  if (userRole !== 'super_admin' && !userPerms.includes('cancel_order') && !userPerms.includes('manage_lab')) {
    res.status(403).json({ error: 'Permission Denied: Missing required permission to cancel orders.' });
    return;
  }

  try {
    const order = await db.queryOne<{ id: string; lab_id: string; status: string; order_number: string }>(
      `SELECT id, lab_id, status, order_number FROM test_orders WHERE id = $1`,
      [orderId]
    );

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (req.user?.lab_id && order.lab_id !== req.user.lab_id) {
      res.status(403).json({ error: 'Access denied: Cannot cancel order belonging to another laboratory' });
      return;
    }

    if (order.status === 'completed' || order.status === 'report_released' || order.status === 'approved') {
      res.status(400).json({ error: 'Cannot cancel an order with approved or released reports' });
      return;
    }

    await db.execute(
      `UPDATE test_orders
       SET status = 'cancelled',
           cancellation_reason = $1,
           cancelled_by = $2,
           cancelled_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [reason || 'Cancelled by staff', req.user?.id || null, orderId]
    );

    // Cancel pending samples
    await db.execute(
      `UPDATE samples SET status = 'rejected', remarks = 'Order Cancelled' WHERE order_id = $1 AND status IN ('pending', 'collected')`,
      [orderId]
    );

    // Cancel draft report
    await db.execute(
      `UPDATE reports SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE order_id = $1 AND status = 'draft'`,
      [orderId]
    );

    auditFromReq(req, 'CANCEL_ORDER', 'test_order', orderId, { status: order.status }, { status: 'cancelled', reason });

    res.json({ message: `Order ${order.order_number} cancelled successfully`, status: 'cancelled' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
