import { Router, Response } from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { auditFromReq } from '../services/auditService';
import { dispatchWebhookEvent } from '../services/webhookDispatchService';

const router = Router();

// ==========================================
// 1. API KEYS
// ==========================================
router.get('/keys', authenticateToken, requirePermission('manage_lab_settings'), async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';

  try {
    const keys = await db.query(
      `SELECT id, lab_id, name, api_key_prefix, permissions, ip_whitelist, rate_limit_rpm, is_active, expires_at, created_at
       FROM api_keys
       WHERE lab_id = $1
       ORDER BY created_at DESC`,
      [labId]
    );

    res.json(keys);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/keys', authenticateToken, requirePermission('manage_lab_settings'), async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';
  const { name, permissions, ip_whitelist, rate_limit_rpm } = req.body;

  if (!name) {
    res.status(400).json({ error: 'Key name is required' });
    return;
  }

  try {
    const rawSecret = `med_live_${crypto.randomBytes(24).toString('hex')}`;
    const prefix = rawSecret.substring(0, 16);
    const hash = crypto.createHash('sha256').update(rawSecret).digest('hex');
    const id = `apk-${uuidv4().substring(0, 8)}`;

    const perms = Array.isArray(permissions) ? JSON.stringify(permissions) : JSON.stringify(['orders:read', 'results:read']);

    await db.execute(
      `INSERT INTO api_keys (id, lab_id, name, api_key_hash, api_key_prefix, permissions, ip_whitelist, rate_limit_rpm, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1)`,
      [id, labId, name, hash, prefix, perms, ip_whitelist || null, rate_limit_rpm || 120]
    );

    auditFromReq(req, 'CREATE_API_KEY', 'api_key', id, null, { name, prefix });

    // Return full secret only ONCE upon creation
    res.status(201).json({
      message: 'API Key generated. Copy the secret key now; it will not be shown again.',
      id,
      name,
      api_key: rawSecret,
      prefix
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/keys/:id', authenticateToken, requirePermission('manage_lab_settings'), async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';

  try {
    await db.execute(`DELETE FROM api_keys WHERE id = $1 AND lab_id = $2`, [req.params.id, labId]);
    auditFromReq(req, 'REVOKE_API_KEY', 'api_key', req.params.id, null, {});
    res.json({ message: 'API key revoked' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. WEBHOOK SUBSCRIPTIONS
// ==========================================
router.get('/webhooks', authenticateToken, requirePermission('manage_lab_settings'), async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';

  try {
    const webhooks = await db.query(
      `SELECT w.*, (SELECT COUNT(*) FROM webhook_deliveries WHERE webhook_id = w.id) as total_deliveries
       FROM webhooks w
       WHERE w.lab_id = $1
       ORDER BY w.created_at DESC`,
      [labId]
    );

    res.json(webhooks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/webhooks', authenticateToken, requirePermission('manage_lab_settings'), async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';
  const { name, target_url, subscribed_events } = req.body;

  if (!name || !target_url) {
    res.status(400).json({ error: 'Webhook name and target_url are required' });
    return;
  }

  try {
    const id = `wh-${uuidv4().substring(0, 8)}`;
    const secret = `sec_${crypto.randomBytes(16).toString('hex')}`;
    const events = Array.isArray(subscribed_events) ? JSON.stringify(subscribed_events) : JSON.stringify(['order.created', 'result.imported', 'report.released']);

    await db.execute(
      `INSERT INTO webhooks (id, lab_id, name, target_url, secret, subscribed_events, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, 1)`,
      [id, labId, name, target_url, secret, events]
    );

    auditFromReq(req, 'CREATE_WEBHOOK', 'webhook', id, null, { name, target_url });

    res.status(201).json({ message: 'Webhook endpoint registered successfully', id, secret });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/developer/webhooks/:id/test - Test fire webhook
router.post('/webhooks/:id/test', authenticateToken, async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';

  try {
    await dispatchWebhookEvent(labId, 'test.ping', {
      message: 'MediFlow LIS Webhook Connectivity Handshake Test',
      timestamp: new Date().toISOString()
    });

    res.json({ message: 'Test webhook event triggered with HMAC-SHA256 signature.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/developer/logs - Combined API & Webhook logs
router.get('/logs', authenticateToken, async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';

  try {
    const deliveries = await db.query(
      `SELECT wd.*, w.name as webhook_name
       FROM webhook_deliveries wd
       JOIN webhooks w ON wd.webhook_id = w.id
       WHERE wd.lab_id = $1
       ORDER BY wd.sent_at DESC LIMIT 30`,
      [labId]
    );

    res.json({ deliveries });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
