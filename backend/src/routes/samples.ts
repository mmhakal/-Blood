import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { auditFromReq } from '../services/auditService';

const router = Router();

// GET /api/samples - list samples for tracking with filters
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const labId = req.user?.lab_id;
    const branchId = req.query.branch_id as string || req.user?.branch_id;
    const status = req.query.status as string;
    const search = req.query.search as string;

    let query = `
      SELECT s.*,
             o.order_number, o.lab_number, o.priority,
             p.name as patient_name, p.patient_id_code, p.age, p.gender, p.mobile as patient_mobile,
             b.name as branch_name,
             u_col.name as collector_name,
             u_proc.name as processor_name
      FROM samples s
      JOIN test_orders o ON s.order_id = o.id
      JOIN patients p ON o.patient_id = p.id
      LEFT JOIN branches b ON s.branch_id = b.id
      LEFT JOIN users u_col ON s.collected_by = u_col.id
      LEFT JOIN users u_proc ON s.processed_by = u_proc.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (labId) {
      params.push(labId);
      query += ` AND s.lab_id = $${params.length}`;
    }

    if (branchId) {
      params.push(branchId);
      query += ` AND s.branch_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND s.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const idx = params.length;
      query += ` AND (LOWER(p.name) LIKE $${idx} OR s.sample_barcode LIKE $${idx} OR o.order_number LIKE $${idx} OR p.patient_id_code LIKE $${idx})`;
    }

    query += ` ORDER BY s.created_at DESC LIMIT 100`;

    const samples = await db.query(query, params);
    res.json(samples);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/samples/:id - get sample details
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const sampleId = req.params.id;
    const sample = await db.queryOne(
      `SELECT s.*,
              o.order_number, o.lab_number, o.priority,
              p.id as patient_id, p.name as patient_name, p.patient_id_code, p.age, p.gender, p.mobile as patient_mobile,
              b.name as branch_name, b.code as branch_code,
              l.name as lab_name,
              u_col.name as collector_name,
              u_proc.name as processor_name
       FROM samples s
       JOIN test_orders o ON s.order_id = o.id
       JOIN patients p ON o.patient_id = p.id
       LEFT JOIN branches b ON s.branch_id = b.id
       LEFT JOIN laboratories l ON s.lab_id = l.id
       LEFT JOIN users u_col ON s.collected_by = u_col.id
       LEFT JOIN users u_proc ON s.processed_by = u_proc.id
       WHERE s.id = $1`,
      [sampleId]
    );

    if (!sample) {
      res.status(404).json({ error: 'Sample not found' });
      return;
    }

    if (req.user?.lab_id && sample.lab_id !== req.user.lab_id) {
      res.status(403).json({ error: 'Access denied: Cannot access sample from another laboratory' });
      return;
    }

    const events = await db.query(
      `SELECT se.*, u.name as performed_by_name
       FROM sample_events se
       LEFT JOIN users u ON se.performed_by = u.id
       WHERE se.sample_id = $1
       ORDER BY se.created_at DESC`,
      [sampleId]
    );

    res.json({ sample, events });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/samples/:id/collect - Phlebotomy collects sample
router.post('/:id/collect', authenticateToken, requirePermission('collect_sample'), async (req: AuthRequest, res: Response) => {
  const sampleId = req.params.id;
  const { collected_by, collected_at, remarks } = req.body;

  try {
    const sample = await db.queryOne<{ id: string; order_id: string; sample_barcode: string; lab_id: string }>(
      `SELECT id, order_id, sample_barcode, lab_id FROM samples WHERE id = $1`,
      [sampleId]
    );

    if (!sample) {
      res.status(404).json({ error: 'Sample not found' });
      return;
    }

    if (req.user?.lab_id && sample.lab_id !== req.user.lab_id) {
      res.status(403).json({ error: 'Access denied: Cannot modify sample belonging to another laboratory' });
      return;
    }

    const collectorId = collected_by || req.user?.id;
    const collectionTime = collected_at || new Date().toISOString();

    await db.execute(
      `UPDATE samples
       SET status = 'collected',
           collected_at = $1,
           collected_by = $2,
           remarks = COALESCE($3, remarks)
       WHERE id = $4`,
      [collectionTime, collectorId, remarks || null, sampleId]
    );

    // Update order status if registered
    await db.execute(
      `UPDATE test_orders SET status = 'sample_collected', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND status = 'registered'`,
      [sample.order_id]
    );

    // Record sample event
    await db.execute(
      `INSERT INTO sample_events (id, sample_id, event_type, description, performed_by)
       VALUES ($1, $2, 'collected', $3, $4)`,
      [`se-${uuidv4().substring(0, 8)}`, sampleId, remarks || 'Sample collected by phlebotomist', req.user?.id || null]
    );

    auditFromReq(req, 'COLLECT_SAMPLE', 'sample', sampleId, null, { barcode: sample.sample_barcode, collected_by: collectorId });

    res.json({ message: 'Sample collected successfully', status: 'collected', sample_barcode: sample.sample_barcode });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/samples/:id/reject - Reject sample with reason & audit log
router.post('/:id/reject', authenticateToken, async (req: AuthRequest, res: Response) => {
  const sampleId = req.params.id;
  const { rejection_reason, remarks, request_recollection } = req.body;
  const userRole = req.user?.role_code;
  const userPerms = req.user?.permissions || [];

  // Check permission
  if (userRole !== 'super_admin' && !userPerms.includes('reject_sample') && !userPerms.includes('collect_sample') && !userPerms.includes('manage_lab')) {
    res.status(403).json({ error: 'Permission Denied: Missing permission to reject samples.' });
    return;
  }

  if (!rejection_reason) {
    res.status(400).json({ error: 'Rejection reason is required' });
    return;
  }

  try {
    const sample = await db.queryOne<{ id: string; order_id: string; sample_barcode: string; lab_id: string }>(
      `SELECT id, order_id, sample_barcode, lab_id FROM samples WHERE id = $1`,
      [sampleId]
    );

    if (!sample) {
      res.status(404).json({ error: 'Sample not found' });
      return;
    }

    if (req.user?.lab_id && sample.lab_id !== req.user.lab_id) {
      res.status(403).json({ error: 'Access denied: Cannot reject sample belonging to another laboratory' });
      return;
    }

    const newStatus = request_recollection ? 'recollection_required' : 'rejected';

    await db.execute(
      `UPDATE samples
       SET status = $1,
           rejection_reason = $2,
           remarks = COALESCE($3, remarks)
       WHERE id = $4`,
      [newStatus, rejection_reason, remarks || null, sampleId]
    );

    // Record sample event
    await db.execute(
      `INSERT INTO sample_events (id, sample_id, event_type, description, performed_by)
       VALUES ($1, $2, 'rejected', $3, $4)`,
      [`se-${uuidv4().substring(0, 8)}`, sampleId, `Sample rejected: ${rejection_reason}. Remarks: ${remarks || 'None'}`, req.user?.id || null]
    );

    auditFromReq(req, 'REJECT_SAMPLE', 'sample', sampleId, null, {
      barcode: sample.sample_barcode,
      rejection_reason,
      status: newStatus,
      request_recollection: Boolean(request_recollection)
    });

    res.json({
      message: `Sample ${sample.sample_barcode} marked as ${newStatus}`,
      status: newStatus,
      rejection_reason
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/samples/:id/recollect - Request recollection
router.post('/:id/recollect', authenticateToken, async (req: AuthRequest, res: Response) => {
  const sampleId = req.params.id;
  const { reason, remarks } = req.body;

  try {
    const sample = await db.queryOne<{ id: string; order_id: string; sample_barcode: string; lab_id: string }>(
      `SELECT id, order_id, sample_barcode, lab_id FROM samples WHERE id = $1`,
      [sampleId]
    );

    if (!sample) {
      res.status(404).json({ error: 'Sample not found' });
      return;
    }

    if (req.user?.lab_id && sample.lab_id !== req.user.lab_id) {
      res.status(403).json({ error: 'Access denied: Cannot access sample belonging to another laboratory' });
      return;
    }

    await db.execute(
      `UPDATE samples
       SET status = 'recollection_required',
           recollection_reason = $1,
           recollection_requested_by = $2,
           recollection_requested_at = CURRENT_TIMESTAMP,
           remarks = COALESCE($3, remarks)
       WHERE id = $4`,
      [reason || 'Recollection required due to pre-analytical error', req.user?.id || null, remarks || null, sampleId]
    );

    await db.execute(
      `INSERT INTO sample_events (id, sample_id, event_type, description, performed_by)
       VALUES ($1, $2, 'recollected', $3, $4)`,
      [`se-${uuidv4().substring(0, 8)}`, sampleId, `Recollection requested: ${reason || 'Pre-analytical issue'}`, req.user?.id || null]
    );

    auditFromReq(req, 'REQUEST_RECOLLECTION', 'sample', sampleId, null, { barcode: sample.sample_barcode, reason });

    res.json({ message: 'Sample recollection requested successfully', status: 'recollection_required' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/samples/:id/barcode - Printable barcode label data
router.get('/:id/barcode', authenticateToken, async (req: AuthRequest, res: Response) => {
  const sampleId = req.params.id;

  try {
    const sample = await db.queryOne(
      `SELECT s.*,
              o.order_number, o.lab_number,
              p.name as patient_name, p.patient_id_code, p.age, p.gender,
              b.name as branch_name, b.code as branch_code,
              l.name as lab_name
       FROM samples s
       JOIN test_orders o ON s.order_id = o.id
       JOIN patients p ON o.patient_id = p.id
       LEFT JOIN branches b ON s.branch_id = b.id
       LEFT JOIN laboratories l ON s.lab_id = l.id
       WHERE s.id = $1`,
      [sampleId]
    );

    if (!sample) {
      res.status(404).json({ error: 'Sample not found' });
      return;
    }

    if (req.user?.lab_id && sample.lab_id !== req.user.lab_id) {
      res.status(403).json({ error: 'Access denied: Cannot access sample from another laboratory' });
      return;
    }

    // Record barcode print log
    const labelId = `lbl-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO barcode_labels (id, lab_id, branch_id, entity_type, entity_id, barcode_text, label_type, printed_by, print_count)
       VALUES ($1, $2, $3, 'sample', $4, $5, 'standard_tube', $6, 1)`,
      [labelId, sample.lab_id, sample.branch_id || null, sampleId, sample.sample_barcode, req.user?.id || null]
    );

    auditFromReq(req, 'PRINT_BARCODE', 'sample', sampleId, null, { barcode: sample.sample_barcode });

    res.json({
      label_id: labelId,
      lab_name: sample.lab_name,
      branch_name: sample.branch_name || 'Central Lab',
      patient_name: sample.patient_name,
      patient_id_code: sample.patient_id_code,
      sample_id: sample.id,
      sample_barcode: sample.sample_barcode,
      sample_type: sample.sample_type,
      container_type: sample.container_type || 'Standard Tube',
      collection_date: sample.collected_at || new Date().toISOString(),
      order_number: sample.order_number
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/samples/:id/status - general status update (backwards compatible)
router.patch('/:id/status', authenticateToken, requirePermission('collect_sample'), async (req: AuthRequest, res: Response) => {
  const sampleId = req.params.id as string;
  const { status, rejection_reason, remarks } = req.body;

  try {
    const sample = await db.queryOne<{ order_id: string; sample_barcode: string; lab_id: string }>(
      `SELECT order_id, sample_barcode, lab_id FROM samples WHERE id = $1`,
      [sampleId]
    );

    if (!sample) {
      res.status(404).json({ error: 'Sample not found' });
      return;
    }

    if (req.user?.lab_id && sample.lab_id !== req.user.lab_id) {
      res.status(403).json({ error: 'Access denied: Cannot access sample from another laboratory' });
      return;
    }

    const updates: string[] = ['status = $1'];
    const params: any[] = [status];

    if (status === 'collected') {
      updates.push('collected_at = CURRENT_TIMESTAMP', 'collected_by = $' + (params.length + 1));
      params.push(req.user?.id);
      await db.execute(`UPDATE test_orders SET status = 'sample_collected', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND status = 'registered'`, [sample.order_id]);
    } else if (status === 'processing') {
      updates.push('processed_at = CURRENT_TIMESTAMP', 'processed_by = $' + (params.length + 1));
      params.push(req.user?.id);
      await db.execute(`UPDATE test_orders SET status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [sample.order_id]);
    } else if (status === 'rejected') {
      updates.push('rejection_reason = $' + (params.length + 1));
      params.push(rejection_reason || 'Hemolyzed / Clotted / Insufficient volume');
    }

    if (remarks) {
      updates.push('remarks = $' + (params.length + 1));
      params.push(remarks);
    }

    params.push(sampleId);
    await db.execute(`UPDATE samples SET ${updates.join(', ')} WHERE id = $${params.length}`, params);

    await db.execute(
      `INSERT INTO sample_events (id, sample_id, event_type, description, performed_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [`se-${Date.now()}`, sampleId, status, remarks || rejection_reason || `Status changed to ${status}`, req.user?.id || null]
    );

    auditFromReq(req, 'UPDATE_SAMPLE_STATUS', 'sample', sampleId, null, { status, barcode: sample.sample_barcode });
    res.json({ message: `Sample status updated to ${status}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
