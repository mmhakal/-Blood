import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requirePermission, requireRole } from '../middleware/rbac';
import { auditFromReq } from '../services/auditService';

const router = Router();

// GET /api/settings - retrieve settings
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const labId = req.user?.lab_id;
    const systemSettings = await db.query(`SELECT * FROM system_settings`);
    const labSettings = labId ? await db.query(`SELECT * FROM laboratory_settings WHERE lab_id = $1`, [labId]) : [];
    const template = labId ? await db.queryOne(`SELECT * FROM report_templates WHERE lab_id = $1 ORDER BY is_default DESC LIMIT 1`, [labId]) : null;

    res.json({
      system: systemSettings,
      laboratory: labSettings,
      template: template
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/laboratory - Update laboratory settings by category
router.post('/laboratory', authenticateToken, requirePermission('manage_lab_settings'), async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id;
  const { category, settings } = req.body;

  if (!labId) {
    res.status(403).json({ error: 'Laboratory context required' });
    return;
  }

  if (!category || !settings || typeof settings !== 'object') {
    res.status(400).json({ error: 'Category and settings object are required' });
    return;
  }

  try {
    for (const [key, val] of Object.entries(settings)) {
      const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
      const id = `lset-${labId}-${category}-${key}`;

      await db.execute(
        `INSERT INTO laboratory_settings (id, lab_id, setting_category, key, value, updated_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         ON CONFLICT (lab_id, key)
         DO UPDATE SET setting_category = $3, value = $5, updated_at = CURRENT_TIMESTAMP`,
        [id, labId, category, key, valStr]
      );
    }

    auditFromReq(req, 'UPDATE_LAB_SETTINGS', 'laboratory_settings', labId, null, { category, keys: Object.keys(settings) });

    res.json({ message: `Laboratory ${category} settings updated successfully` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/branch - Update branch settings
router.post('/branch', authenticateToken, requirePermission('manage_branches'), async (req: AuthRequest, res: Response) => {
  const { branch_id, settings } = req.body;

  if (!branch_id || !settings || typeof settings !== 'object') {
    res.status(400).json({ error: 'branch_id and settings object are required' });
    return;
  }

  try {
    for (const [key, val] of Object.entries(settings)) {
      const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
      const id = `bset-${branch_id}-${key}`;

      await db.execute(
        `INSERT INTO branch_settings (id, branch_id, key, value, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (branch_id, key)
         DO UPDATE SET value = $4, updated_at = CURRENT_TIMESTAMP`,
        [id, branch_id, key, valStr]
      );
    }

    auditFromReq(req, 'UPDATE_BRANCH_SETTINGS', 'branch_settings', branch_id, null, { keys: Object.keys(settings) });

    res.json({ message: 'Branch settings updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/system - Update system-wide settings (Super Admin only)
router.post('/system', authenticateToken, requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  const { settings } = req.body;

  if (!settings || typeof settings !== 'object') {
    res.status(400).json({ error: 'Settings object required' });
    return;
  }

  try {
    for (const [key, val] of Object.entries(settings)) {
      const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
      await db.execute(
        `INSERT INTO system_settings (id, key, value, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (key) DO UPDATE SET value = $3, updated_at = CURRENT_TIMESTAMP`,
        [`sys-${key}`, key, valStr]
      );
    }

    auditFromReq(req, 'UPDATE_SYSTEM_SETTINGS', 'system_settings', 'system', null, { keys: Object.keys(settings) });

    res.json({ message: 'System settings updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings/template - update report template configuration
router.put('/template', authenticateToken, requirePermission('manage_lab_settings'), async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id;
  const { header_html, footer_html, show_logo, show_qr, show_barcode, show_doctor_signature, show_technician_signature, watermark_text } = req.body;

  if (!labId) {
    res.status(400).json({ error: 'Laboratory context missing' });
    return;
  }

  try {
    const existing = await db.queryOne<{ id: string }>(`SELECT id FROM report_templates WHERE lab_id = $1 LIMIT 1`, [labId]);

    if (existing) {
      await db.execute(
        `UPDATE report_templates
         SET header_html = COALESCE($1, header_html),
             footer_html = COALESCE($2, footer_html),
             show_logo = COALESCE($3, show_logo),
             show_qr = COALESCE($4, show_qr),
             show_barcode = COALESCE($5, show_barcode),
             show_doctor_signature = COALESCE($6, show_doctor_signature),
             show_technician_signature = COALESCE($7, show_technician_signature),
             watermark_text = COALESCE($8, watermark_text)
         WHERE id = $9`,
        [header_html, footer_html, show_logo, show_qr, show_barcode, show_doctor_signature, show_technician_signature, watermark_text, existing.id]
      );
    } else {
      await db.execute(
        `INSERT INTO report_templates (id, lab_id, name, is_default, header_html, footer_html, show_logo, show_qr, show_barcode, show_doctor_signature, show_technician_signature, watermark_text)
         VALUES ($1, $2, 'Custom Template', 1, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [`tmpl-${labId}`, labId, header_html || '', footer_html || '', show_logo ?? 1, show_qr ?? 1, show_barcode ?? 1, show_doctor_signature ?? 1, show_technician_signature ?? 1, watermark_text || '']
      );
    }

    auditFromReq(req, 'UPDATE_REPORT_TEMPLATE', 'template', labId);
    res.json({ message: 'Report template updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
