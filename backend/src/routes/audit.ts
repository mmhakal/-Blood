import { Router, Response } from 'express';
import db from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

// GET /api/audit-logs
router.get('/', authenticateToken, requirePermission('view_audit_logs'), async (req: AuthRequest, res: Response) => {
  try {
    const labId = req.user?.lab_id;
    const action = req.query.action as string;
    const entityType = req.query.entity_type as string;

    let query = `SELECT * FROM audit_logs WHERE 1=1`;
    const params: any[] = [];

    if (req.user?.role_code !== 'super_admin' && labId) {
      params.push(labId);
      query += ` AND lab_id = $${params.length}`;
    }

    if (action) {
      params.push(action);
      query += ` AND action = $${params.length}`;
    }

    if (entityType) {
      params.push(entityType);
      query += ` AND entity_type = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC LIMIT 200`;

    const logs = await db.query(query, params);
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
