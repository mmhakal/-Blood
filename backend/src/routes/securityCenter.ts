import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { auditFromReq } from '../services/auditService';

const router = Router();

// GET /api/security-center/sessions - List active user sessions
router.get('/sessions', authenticateToken, requireRole('super_admin', 'lab_admin'), async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';

  try {
    const sessions = await db.query(
      `SELECT s.*, u.name as user_name, u.email as user_email, r.name as role_name
       FROM active_sessions s
       JOIN users u ON s.user_id = u.id
       JOIN roles r ON u.role_id = r.id
       WHERE (s.lab_id = $1 OR s.lab_id IS NULL) AND s.is_revoked = 0
       ORDER BY s.last_activity_time DESC`,
      [labId]
    );

    res.json(sessions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/security-center/sessions/:id/revoke - Revoke active user session remotely
router.post('/sessions/:id/revoke', authenticateToken, requireRole('super_admin', 'lab_admin'), async (req: AuthRequest, res: Response) => {
  try {
    await db.execute(
      `UPDATE active_sessions SET is_revoked = 1 WHERE id = $1`,
      [req.params.id]
    );

    // Also log security event
    const eventId = `sec-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO security_events (id, lab_id, user_id, event_type, ip_address, details)
       VALUES ($1, $2, $3, 'session_revoked', $4, $5)`,
      [eventId, req.user?.lab_id || 'lab-apex', req.user?.id || null, req.ip || '127.0.0.1', `Administrator terminated session ID ${req.params.id}`]
    );

    auditFromReq(req, 'REVOKE_USER_SESSION', 'active_sessions', req.params.id, null, {});
    res.json({ message: 'User session revoked and terminated immediately' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/security-center/events - Audit events stream
router.get('/events', authenticateToken, requireRole('super_admin', 'lab_admin'), async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';

  try {
    const events = await db.query(
      `SELECT se.*, u.name as user_name, u.email as user_email
       FROM security_events se
       LEFT JOIN users u ON se.user_id = u.id
       WHERE se.lab_id = $1 OR se.lab_id IS NULL
       ORDER BY se.created_at DESC LIMIT 50`,
      [labId]
    );

    res.json(events);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
