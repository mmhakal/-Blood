import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { auditFromReq } from '../services/auditService';

const router = Router();

// GET /api/equipment - List laboratory equipment assets
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';

  try {
    const items = await db.query(
      `SELECT e.*, b.name as branch_name,
              (SELECT COUNT(*) FROM equipment_maintenance WHERE equipment_id = e.id) as maintenance_count,
              (SELECT MAX(completed_date) FROM equipment_maintenance WHERE equipment_id = e.id AND status = 'completed') as last_maintenance_date
       FROM equipment e
       LEFT JOIN branches b ON e.branch_id = b.id
       WHERE e.lab_id = $1
       ORDER BY e.category ASC, e.name ASC`,
      [labId]
    );

    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/equipment - Register laboratory equipment
router.post('/', authenticateToken, requirePermission('manage_lab_settings'), async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';
  const { asset_id, name, category, manufacturer, model, serial_number, location, branch_id, service_provider, contact_phone, next_maintenance_date } = req.body;

  if (!asset_id || !name || !category || !manufacturer) {
    res.status(400).json({ error: 'Asset ID, name, category, and manufacturer are required' });
    return;
  }

  try {
    const id = `eq-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO equipment (id, lab_id, branch_id, asset_id, name, category, manufacturer, model, serial_number, location, service_provider, contact_phone, status, next_maintenance_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'operational', $13)`,
      [id, labId, branch_id || null, asset_id.trim().toUpperCase(), name, category, manufacturer, model || '', serial_number || '', location || '', service_provider || '', contact_phone || '', next_maintenance_date || null]
    );

    auditFromReq(req, 'REGISTER_EQUIPMENT', 'equipment', id, null, { asset_id, name, category });

    res.status(201).json({ message: 'Equipment asset registered successfully', id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/equipment/maintenance - Maintenance logs & schedules
router.get('/maintenance', authenticateToken, async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';

  try {
    const logs = await db.query(
      `SELECT em.*, e.name as equipment_name, e.asset_id, e.category, e.location
       FROM equipment_maintenance em
       JOIN equipment e ON em.equipment_id = e.id
       WHERE em.lab_id = $1
       ORDER BY em.scheduled_date DESC LIMIT 50`,
      [labId]
    );

    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/equipment/maintenance - Record or schedule maintenance
router.post('/maintenance', authenticateToken, async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';
  const { equipment_id, maintenance_type, scheduled_date, completed_date, performed_by_vendor, service_cost, downtime_hours, work_summary, next_due_date, status } = req.body;

  if (!equipment_id || !maintenance_type || !scheduled_date) {
    res.status(400).json({ error: 'equipment_id, maintenance_type, and scheduled_date are required' });
    return;
  }

  try {
    const id = `maint-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO equipment_maintenance (id, lab_id, equipment_id, maintenance_type, scheduled_date, completed_date, performed_by_vendor, service_cost, downtime_hours, work_summary, next_due_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [id, labId, equipment_id, maintenance_type, scheduled_date, completed_date || null, performed_by_vendor || '', service_cost || 0, downtime_hours || 0, work_summary || '', next_due_date || null, status || 'completed']
    );

    if (next_due_date) {
      await db.execute(`UPDATE equipment SET next_maintenance_date = $1 WHERE id = $2`, [next_due_date, equipment_id]);
    }

    auditFromReq(req, 'RECORD_MAINTENANCE', 'equipment_maintenance', id, null, { equipment_id, maintenance_type, cost: service_cost });

    res.status(201).json({ message: 'Equipment maintenance log recorded successfully', id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/equipment/calibrations - Calibration logs & certificates
router.get('/calibrations', authenticateToken, async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';

  try {
    const cals = await db.query(
      `SELECT c.*, a.name as analyzer_name, t.name as test_name, u.name as performed_by_name
       FROM calibrations c
       LEFT JOIN analyzers a ON c.analyzer_id = a.id
       LEFT JOIN tests t ON c.test_id = t.id
       LEFT JOIN users u ON c.performed_by = u.id
       WHERE c.lab_id = $1
       ORDER BY c.calibration_date DESC LIMIT 50`,
      [labId]
    );

    res.json(cals);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/equipment/calibrations - Record calibration run
router.post('/calibrations', authenticateToken, async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';
  const { analyzer_id, test_id, calibrator_lot, calibration_date, next_due_date, status, notes, results_json } = req.body;

  if (!calibrator_lot || !calibration_date || !next_due_date) {
    res.status(400).json({ error: 'Calibrator lot, calibration date, and next due date are required' });
    return;
  }

  try {
    const id = `cal-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO calibrations (id, lab_id, analyzer_id, test_id, calibrator_lot, calibration_date, next_due_date, status, performed_by, notes, results_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [id, labId, analyzer_id || null, test_id || null, calibrator_lot, calibration_date, next_due_date, status || 'passed', req.user?.id, notes || '', typeof results_json === 'object' ? JSON.stringify(results_json) : results_json || null]
    );

    if (analyzer_id) {
      await db.execute(`UPDATE analyzers SET calibration_date = $1 WHERE id = $2`, [calibration_date, analyzer_id]);
    }

    auditFromReq(req, 'RECORD_CALIBRATION', 'calibration', id, null, { calibrator_lot, analyzer_id });

    res.status(201).json({ message: 'Calibration record saved successfully', id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
