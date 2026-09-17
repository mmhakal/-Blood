import { Router, Response } from 'express';
import db from '../db/database';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireTenant } from '../middleware/tenant';
import { requireRoles } from '../middleware/rbac';
import QualityGovernanceService from '../services/qualityGovernanceService';
import { auditFromReq } from '../services/auditService';

const router = Router();

const resolveLabId = (req: AuthRequest): string => {
  return req.user?.lab_id || (req.user?.role_code === 'super_admin' ? ((req.query.lab_id as string) || (req.headers['x-lab-id'] as string) || 'lab-apex') : 'lab-apex');
};

// GET /api/quality-governance/sops - List laboratory SOPs
router.get('/sops', authenticateToken, requireTenant, async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);

  try {
    const sops = await db.query<any>(
      `SELECT * FROM sops WHERE ($1 IS NULL OR lab_id = $1) ORDER BY sop_number ASC`,
      [labId]
    );
    res.json(sops);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/quality-governance/sops - Create or revise SOP
router.post('/sops', authenticateToken, requireTenant, requireRoles(['super_admin', 'lab_admin', 'pathologist']), async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);
  const { sop_number, title, department, category, version, content_text } = req.body;

  if (!sop_number || !title || !department) {
    res.status(400).json({ error: 'SOP number, title, and department are required' });
    return;
  }

  try {
    const id = `sop-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO sops (id, lab_id, sop_number, title, department, category, version, status, content_text, effective_date, review_date, author_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'published', $8, CURRENT_DATE, DATE('now', '+1 year'), $9)`,
      [
        id,
        labId,
        sop_number,
        title,
        department,
        category || 'analytical',
        version || '1.0',
        content_text || null,
        req.user?.id,
      ]
    );

    auditFromReq(req, 'CREATE_SOP', 'sop', id, null, { sop_number, title });
    const sop = await db.queryOne(`SELECT * FROM sops WHERE id = $1`, [id]);
    res.status(201).json(sop);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/quality-governance/incidents - List laboratory incidents & CAPA
router.get('/incidents', authenticateToken, requireTenant, async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);

  try {
    const incidents = await db.query<any>(
      `SELECT i.*, c.id as capa_id, c.capa_number, c.status as capa_status, c.corrective_action, c.preventive_action
       FROM incidents i
       LEFT JOIN capa_records c ON c.incident_id = i.id
       WHERE ($1 IS NULL OR i.lab_id = $1)
       ORDER BY i.incident_date DESC`,
      [labId]
    );
    res.json(incidents);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/quality-governance/capa - List CAPA records
router.get('/capa', authenticateToken, requireTenant, async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);

  try {
    const capas = await db.query<any>(
      `SELECT c.*, i.incident_number, i.description as incident_description, i.severity
       FROM capa_records c
       LEFT JOIN incidents i ON c.incident_id = i.id
       WHERE ($1 IS NULL OR c.lab_id = $1)
       ORDER BY c.created_at DESC`,
      [labId]
    );
    res.json(capas);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/quality-governance/incidents - Report incident
router.post('/incidents', authenticateToken, requireTenant, async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);
  const { incident_type, description, severity, department } = req.body;

  if (!incident_type || !description) {
    res.status(400).json({ error: 'Incident type and description are required' });
    return;
  }

  try {
    const result = await QualityGovernanceService.logIncident(labId, req.body, req.user?.id || 'system');
    auditFromReq(req, 'LOG_INCIDENT', 'incident', result.incident?.id, null, { incident_number: result.incident?.incident_number });
    res.status(201).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/quality-governance/capa/:id/close - Close CAPA
router.put('/capa/:id/close', authenticateToken, requireTenant, requireRoles(['super_admin', 'lab_admin', 'pathologist']), async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);
  const { effectiveness_notes } = req.body;

  try {
    const closed = await QualityGovernanceService.closeCapa(
      req.params.id as string,
      labId,
      req.user?.id || 'system',
      effectiveness_notes || 'Verified effective upon review'
    );
    auditFromReq(req, 'CLOSE_CAPA', 'capa', req.params.id, null, { status: 'closed' });
    res.json(closed);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/quality-governance/risk-register - Enterprise Risk Register
router.get('/risk-register', authenticateToken, requireTenant, async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);

  try {
    const risks = await db.query<any>(
      `SELECT * FROM risk_register WHERE ($1 IS NULL OR lab_id = $1) ORDER BY risk_score DESC`,
      [labId]
    );
    res.json(risks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/quality-governance/licenses - Regulatory licenses & certificates
router.get('/licenses', authenticateToken, requireTenant, async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);

  try {
    const licenses = await QualityGovernanceService.checkExpiringLicenses(labId);
    res.json(licenses);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/quality-governance/assets - Enterprise Assets
router.get('/assets', authenticateToken, requireTenant, async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);

  try {
    const assets = await db.query<any>(
      `SELECT * FROM assets WHERE ($1 IS NULL OR lab_id = $1) ORDER BY name ASC`,
      [labId]
    );
    res.json(assets);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
