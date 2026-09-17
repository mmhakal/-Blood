import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import OfflineSyncService from '../services/offlineSyncService';
import { auditFromReq } from '../services/auditService';

const router = Router();

// GET /api/mobile/devices - List registered mobile devices
router.get('/devices', authenticateToken, async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || (req.headers['x-lab-id'] as string) || (req.user?.role_code === 'super_admin' ? null : 'lab-apex');

  try {
    const devices = await db.query(
      `SELECT md.*, 
              COALESCE(md.push_token, md.id) as device_uid,
              (CASE WHEN md.is_trusted = 1 THEN 'active' ELSE 'revoked' END) as status,
              COALESCE(u.name, 'Field Phlebotomist') as user_name, 
              u.email as user_email
       FROM mobile_devices md
       LEFT JOIN users u ON md.user_id = u.id
       ${labId ? `WHERE md.lab_id = '${labId}'` : 'WHERE 1=1'}
       ORDER BY md.created_at DESC`
    );
    res.json(devices);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mobile/devices - Register new mobile device
router.post('/devices', authenticateToken, async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';
  const { device_name, platform, app_version, push_token } = req.body;

  if (!device_name || !platform) {
    res.status(400).json({ error: 'device_name and platform (ios/android/pwa) are required' });
    return;
  }

  try {
    const id = `dev-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO mobile_devices (id, user_id, lab_id, device_name, platform, app_version, push_token, is_trusted)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 1)`,
      [id, req.user?.id || 'user-technician', labId, device_name, platform, app_version || '1.0.0', push_token || '']
    );

    auditFromReq(req, 'REGISTER_MOBILE_DEVICE', 'mobile_device', id, null, { device_name, platform });
    res.status(201).json({ message: 'Mobile device registered successfully', id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/mobile/sync/status - Synchronization queue & conflicts dashboard
router.get('/sync/status', authenticateToken, async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';

  try {
    const pending = await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM offline_transactions WHERE lab_id = $1 AND status = 'pending'`, [labId]);
    const completed = await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM offline_transactions WHERE lab_id = $1 AND status = 'completed'`, [labId]);
    const conflicts = await db.query(
      `SELECT sc.*, ot.action_type, ot.device_id
       FROM sync_conflicts sc
       JOIN offline_transactions ot ON sc.transaction_id = ot.id
       WHERE ot.lab_id = $1 AND sc.status = 'unresolved'`,
      [labId]
    );

    res.json({
      pending_transactions: Number(pending?.count || 0),
      completed_transactions: Number(completed?.count || 0),
      unresolved_conflicts_count: conflicts.length,
      conflicts
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mobile/sync/batch - Process a batch of offline transactions from mobile client
router.post('/sync/batch', authenticateToken, async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';
  const { device_id, transactions } = req.body;

  if (!device_id || !Array.isArray(transactions)) {
    res.status(400).json({ error: 'device_id and transactions array are required' });
    return;
  }

  try {
    const result = await OfflineSyncService.processSyncBatch(
      labId,
      device_id,
      req.user?.branch_id || null,
      transactions
    );

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mobile/sync/conflicts/:id/resolve - Resolve a sync conflict
router.post('/sync/conflicts/:id/resolve', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { strategy } = req.body; // server_wins, client_wins

  if (!strategy || !['server_wins', 'client_wins'].includes(strategy)) {
    res.status(400).json({ error: 'Valid strategy (server_wins or client_wins) is required' });
    return;
  }

  try {
    const resolution = await OfflineSyncService.resolveConflict(
      req.params.id as string,
      strategy,
      req.user?.name || 'Administrator'
    );

    auditFromReq(req, 'RESOLVE_SYNC_CONFLICT', 'sync_conflict', req.params.id, null, { strategy });
    res.json(resolution);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
