import { Router, Response } from 'express';
import db from '../db/database';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireTenant } from '../middleware/tenant';
import FieldOperationsService from '../services/fieldOperationsService';
import { auditFromReq } from '../services/auditService';

const router = Router();

const resolveLabId = (req: AuthRequest): string => {
  return req.user?.lab_id || (req.user?.role_code === 'super_admin' ? ((req.query.lab_id as string) || (req.headers['x-lab-id'] as string) || 'lab-apex') : 'lab-apex');
};

// Handler: List home collection requests
const listHomeCollections = async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);

  try {
    const requests = await db.query<any>(
      `SELECT hc.*, p.name as phlebotomist_name, p.mobile as phlebotomist_mobile
       FROM home_collection_requests hc
       LEFT JOIN phlebotomists p ON hc.assigned_phlebotomist_id = p.id
       WHERE ($1 IS NULL OR hc.lab_id = $1)
       ORDER BY hc.scheduled_date DESC, hc.created_at DESC`,
      [labId]
    );
    res.json(requests);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Handler: Book home collection
const bookHomeCollection = async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);
  const { patient_name, mobile, address, scheduled_date, scheduled_time_slot } = req.body;

  const addressVal = address || req.body.collection_address;
  if (!patient_name || (!mobile && !req.body.patient_phone) || !addressVal) {
    res.status(400).json({ error: 'Patient name, contact number, and address are required' });
    return;
  }

  const payload = {
    ...req.body,
    address: addressVal,
    mobile: mobile || req.body.patient_phone,
    scheduled_date: scheduled_date || req.body.scheduled_slot?.split('T')[0] || new Date().toISOString().split('T')[0],
    scheduled_time_slot: scheduled_time_slot || req.body.scheduled_slot?.split('T')[1] || '10:00 - 11:00 AM'
  };


  try {
    const hc = await FieldOperationsService.bookHomeCollection(labId, payload);
    auditFromReq(req, 'BOOK_HOME_COLLECTION', 'home_collection', hc?.id, null, { patient_name, scheduled_date: payload.scheduled_date });
    res.status(201).json(hc);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

router.get('/home-collection', authenticateToken, requireTenant, listHomeCollections);
router.get('/home-collections', authenticateToken, requireTenant, listHomeCollections);
router.post('/home-collection', authenticateToken, requireTenant, bookHomeCollection);
router.post('/home-collections', authenticateToken, requireTenant, bookHomeCollection);

// PUT & PATCH /api/field-services/home-collections/:id/status (and singular alias) - Update collection status
const handleCollectionStatusUpdate = async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);
  const { status, barcode, phlebotomist_id, cancellation_reason } = req.body;

  if (!status) {
    res.status(400).json({ error: 'Status is required' });
    return;
  }

  try {
    const updated = await FieldOperationsService.updateHomeCollectionStatus(
      req.params.id as string,
      labId,
      status,
      { barcode, phlebotomist_id, cancellation_reason }
    );
    auditFromReq(req, 'UPDATE_HOME_COLLECTION_STATUS', 'home_collection', req.params.id, null, { status });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

router.put('/home-collection/:id/status', authenticateToken, requireTenant, handleCollectionStatusUpdate);
router.patch('/home-collection/:id/status', authenticateToken, requireTenant, handleCollectionStatusUpdate);
router.put('/home-collections/:id/status', authenticateToken, requireTenant, handleCollectionStatusUpdate);
router.patch('/home-collections/:id/status', authenticateToken, requireTenant, handleCollectionStatusUpdate);

// GET /api/field-services/phlebotomists - List field phlebotomists
router.get('/phlebotomists', authenticateToken, requireTenant, async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);

  try {
    const phlebs = await db.query<any>(
      `SELECT * FROM phlebotomists WHERE ($1 IS NULL OR lab_id = $1) ORDER BY name ASC`,
      [labId]
    );
    res.json(phlebs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/field-services/appointments - List appointments
router.get('/appointments', authenticateToken, requireTenant, async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);

  try {
    const apts = await db.query<any>(
      `SELECT * FROM appointments WHERE ($1 IS NULL OR lab_id = $1) ORDER BY appointment_date DESC, time_slot ASC`,
      [labId]
    );
    res.json(apts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/field-services/appointments - Book appointment
router.post('/appointments', authenticateToken, requireTenant, async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);
  const { patient_name, mobile, appointment_date, time_slot, appointment_type, tests_requested } = req.body;

  if (!patient_name || !mobile || !appointment_date || !time_slot) {
    res.status(400).json({ error: 'Patient name, mobile, appointment_date, and time_slot are required' });
    return;
  }

  try {
    const id = `apt-${uuidv4().substring(0, 8)}`;
    const aptNum = `APT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    await db.execute(
      `INSERT INTO appointments (id, lab_id, branch_id, appointment_number, patient_name, mobile, appointment_type, appointment_date, time_slot, tests_requested, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'confirmed')`,
      [
        id,
        labId,
        req.body.branch_id || null,
        aptNum,
        patient_name,
        mobile,
        appointment_type || 'walk_in',
        appointment_date,
        time_slot,
        tests_requested || null,
      ]
    );

    const apt = await db.queryOne(`SELECT * FROM appointments WHERE id = $1`, [id]);
    res.status(201).json(apt);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Handler: Get active queue tokens
const getQueueTokens = async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);
  const branchId = (req.query.branch_id as string) || req.user?.branch_id;

  try {
    const tokens = await db.query<any>(
      `SELECT * FROM queue_tokens 
       WHERE ($1 IS NULL OR lab_id = $1) ${branchId ? `AND branch_id = '${branchId}'` : ''} 
       ORDER BY CASE status WHEN 'serving' THEN 1 WHEN 'waiting' THEN 2 ELSE 3 END, issued_at ASC`,
      [labId]
    );
    res.json(tokens);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Handler: Generate queue token
const issueQueueToken = async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);
  const branchId = req.body.branch_id || req.user?.branch_id || 'branch-apex-01';
  const category = req.body.category || req.body.department || 'sample_collection';

  try {
    const token = await FieldOperationsService.issueQueueToken(labId, branchId, category, req.body.patient_name || 'Walk-in Patient');
    res.status(201).json(token);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

router.get('/queue/tokens', authenticateToken, requireTenant, getQueueTokens);
router.get('/queue-tokens', authenticateToken, requireTenant, getQueueTokens);
router.post('/queue/tokens', authenticateToken, requireTenant, issueQueueToken);
router.post('/queue-tokens', authenticateToken, requireTenant, issueQueueToken);

export default router;
