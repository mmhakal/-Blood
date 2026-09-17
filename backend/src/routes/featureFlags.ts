import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { auditFromReq } from '../services/auditService';

const router = Router();

// GET /api/feature-flags - List feature flags
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const flags = await db.query(`SELECT * FROM feature_flags ORDER BY flag_key ASC`);
    res.json(flags);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/feature-flags/:key - Update feature flag status
router.put('/:key', authenticateToken, requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  const { is_enabled, rollout_percentage } = req.body;

  try {
    await db.execute(
      `UPDATE feature_flags
       SET is_enabled = $1, rollout_percentage = $2, updated_at = CURRENT_TIMESTAMP
       WHERE flag_key = $3`,
      [is_enabled !== false ? 1 : 0, rollout_percentage !== undefined ? rollout_percentage : 100, req.params.key]
    );

    auditFromReq(req, 'UPDATE_FEATURE_FLAG', 'feature_flags', req.params.key, null, { is_enabled, rollout_percentage });
    res.json({ message: `Feature flag ${req.params.key} updated` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/feature-flags/versions - List configuration versions
router.get('/versions', authenticateToken, async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';

  try {
    const versions = await db.query(
      `SELECT cv.*, u.name as created_by_name
       FROM configuration_versions cv
       JOIN users u ON cv.created_by = u.id
       WHERE cv.lab_id = $1
       ORDER BY cv.created_at DESC`,
      [labId]
    );

    res.json(versions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/feature-flags/versions/:id/rollback - Rollback to configuration version
router.post('/versions/:id/rollback', authenticateToken, requireRole('super_admin', 'lab_admin'), async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';

  try {
    const target = await db.queryOne<{ id: string; config_type: string; version_number: number }>(
      `SELECT * FROM configuration_versions WHERE id = $1 AND lab_id = $2`,
      [req.params.id, labId]
    );

    if (!target) {
      res.status(404).json({ error: 'Configuration version not found' });
      return;
    }

    // Set all other versions of this type inactive
    await db.execute(
      `UPDATE configuration_versions SET is_active = 0 WHERE config_type = $1 AND lab_id = $2`,
      [target.config_type, labId]
    );

    // Set this version active
    await db.execute(
      `UPDATE configuration_versions SET is_active = 1 WHERE id = $1`,
      [target.id]
    );

    auditFromReq(req, 'ROLLBACK_CONFIGURATION', 'configuration_versions', target.id, null, { config_type: target.config_type, version: target.version_number });
    res.json({ message: `Successfully rolled back ${target.config_type} to Version ${target.version_number}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
