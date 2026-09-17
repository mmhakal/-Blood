import { Router, Response } from 'express';
import db from '../db/database';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireTenant } from '../middleware/tenant';
import { auditFromReq } from '../services/auditService';

const router = Router();

const resolveLabId = (req: AuthRequest): string => {
  return req.user?.lab_id || (req.query.lab_id as string) || (req.headers['x-lab-id'] as string) || 'lab-apex';
};

// GET /api/workforce/attendance - Get attendance records
router.get('/attendance', authenticateToken, requireTenant, async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);
  const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

  try {
    const attendance = await db.query<any>(
      `SELECT a.*, u.name as user_name, u.email as user_email, s.name as shift_name
       FROM attendance a
       JOIN users u ON a.user_id = u.id
       LEFT JOIN shifts s ON a.shift_id = s.id
       WHERE a.lab_id = $1 AND a.attendance_date = $2
       ORDER BY a.check_in_time DESC`,
      [labId, date]
    );
    res.json(attendance);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/workforce/attendance/punch - Check in / Check out punch
router.post('/attendance/punch', authenticateToken, requireTenant, async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);
  const userId = req.user?.id;
  const punchType = req.body.type || 'check_in'; // check_in or check_out
  const today = new Date().toISOString().split('T')[0];

  try {
    const existing = await db.queryOne<any>(
      `SELECT * FROM attendance WHERE user_id = $1 AND attendance_date = $2`,
      [userId, today]
    );

    if (punchType === 'check_in') {
      if (existing && existing.check_in_time) {
        res.status(200).json({ message: 'Checked in successfully', record: existing });
        return;
      }

      const id = existing?.id || `att-${uuidv4().substring(0, 8)}`;
      await db.execute(
        `INSERT INTO attendance (id, lab_id, branch_id, user_id, attendance_date, check_in_time, shift_id, status)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, 'present')
         ON CONFLICT (id) DO UPDATE SET check_in_time = CURRENT_TIMESTAMP`,
        [id, labId, req.user?.branch_id || null, userId, today, req.body.shift_id || null]
      );
      const rec = await db.queryOne(`SELECT * FROM attendance WHERE id = $1`, [id]);
      auditFromReq(req, 'STAFF_CHECK_IN', 'attendance', id, null, { user_id: userId });
      res.status(201).json({ message: 'Checked in successfully', record: rec });
    } else {
      if (!existing) {
        res.status(400).json({ error: 'No check-in record found for today' });
        return;
      }
      await db.execute(
        `UPDATE attendance SET check_out_time = CURRENT_TIMESTAMP WHERE id = $1`,
        [existing.id]
      );
      const rec = await db.queryOne(`SELECT * FROM attendance WHERE id = $1`, [existing.id]);
      auditFromReq(req, 'STAFF_CHECK_OUT', 'attendance', existing.id, null, { user_id: userId });
      res.json({ message: 'Checked out successfully', record: rec });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/workforce/shifts - List shift templates
router.get('/shifts', authenticateToken, requireTenant, async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);

  try {
    const shifts = await db.query<any>(
      `SELECT * FROM shifts WHERE lab_id = $1 ORDER BY start_time ASC`,
      [labId]
    );
    res.json(shifts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/workforce/shifts - Create shift template
router.post('/shifts', authenticateToken, requireTenant, async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);
  const { name, start_time, end_time, department, color_code } = req.body;
  const shiftName = name || req.body.shift_name;

  if (!shiftName || !start_time || !end_time) {
    res.status(400).json({ error: 'Shift name, start_time, and end_time are required' });
    return;
  }

  try {
    const id = `shift-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO shifts (id, lab_id, name, start_time, end_time, department, color_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, labId, shiftName, start_time, end_time, department || 'laboratory', color_code || '#3b82f6']
    );

    const shift: any = await db.queryOne(`SELECT * FROM shifts WHERE id = $1`, [id]);
    res.status(201).json({
      ...shift,
      shift_name: shift?.name || shiftName
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// GET /api/workforce/leave - List leave requests
router.get('/leave', authenticateToken, requireTenant, async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);

  try {
    const leaves = await db.query<any>(
      `SELECT l.*, u.name as user_name
       FROM leave_records l
       JOIN users u ON l.user_id = u.id
       WHERE l.lab_id = $1
       ORDER BY l.start_date DESC`,
      [labId]
    );
    res.json(leaves);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/workforce/leave - Apply for leave
router.post('/leave', authenticateToken, requireTenant, async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);
  const { leave_type, start_date, end_date, reason } = req.body;

  if (!leave_type || !start_date || !end_date) {
    res.status(400).json({ error: 'Leave type, start_date, and end_date are required' });
    return;
  }

  try {
    const id = `lev-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO leave_records (id, lab_id, user_id, leave_type, start_date, end_date, reason, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
      [id, labId, req.user?.id, leave_type, start_date, end_date, reason || null]
    );

    const leave = await db.queryOne(`SELECT * FROM leave_records WHERE id = $1`, [id]);
    res.status(201).json(leave);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
