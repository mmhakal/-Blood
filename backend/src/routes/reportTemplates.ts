import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { auditFromReq } from '../services/auditService';

const router = Router();

// GET /api/report-templates - List report design templates
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id;

  try {
    const templates = await db.query(
      `SELECT t.*, b.name as branch_name
       FROM report_templates t
       LEFT JOIN branches b ON t.branch_id = b.id
       WHERE t.lab_id = $1 OR t.lab_id = 'lab-apex'
       ORDER BY t.is_default DESC, t.name ASC`,
      [labId || 'lab-apex']
    );

    res.json(templates);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/report-templates/:id - Template details
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const template = await db.queryOne(
      `SELECT * FROM report_templates WHERE id = $1`,
      [req.params.id]
    );

    if (!template) {
      res.status(404).json({ error: 'Report template not found' });
      return;
    }

    const versions = await db.query(
      `SELECT tv.*, u.name as changed_by_name
       FROM report_template_versions tv
       LEFT JOIN users u ON tv.changed_by = u.id
       WHERE tv.template_id = $1
       ORDER BY tv.version_number DESC`,
      [req.params.id]
    );

    res.json({ template, versions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/report-templates - Create new template
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id;
  if (!labId) {
    res.status(403).json({ error: 'Laboratory context required' });
    return;
  }

  const { name, branch_id, is_default, header_html, footer_html, show_logo, show_qr, show_barcode, show_doctor_signature, show_technician_signature, watermark_text, signature_layout, styles_json } = req.body;

  if (!name) {
    res.status(400).json({ error: 'Template name is required' });
    return;
  }

  try {
    const id = `tpl-${uuidv4().substring(0, 8)}`;

    if (is_default) {
      await db.execute(`UPDATE report_templates SET is_default = 0 WHERE lab_id = $1`, [labId]);
    }

    await db.execute(
      `INSERT INTO report_templates (id, lab_id, branch_id, name, is_default, header_html, footer_html, show_logo, show_qr, show_barcode, show_doctor_signature, show_technician_signature, watermark_text, signature_layout, styles_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        id, labId, branch_id || null, name, is_default ? 1 : 0,
        header_html || null, footer_html || null,
        show_logo !== false ? 1 : 0, show_qr !== false ? 1 : 0, show_barcode !== false ? 1 : 0,
        show_doctor_signature !== false ? 1 : 0, show_technician_signature !== false ? 1 : 0,
        watermark_text || null, signature_layout || 'standard',
        styles_json ? (typeof styles_json === 'string' ? styles_json : JSON.stringify(styles_json)) : null
      ]
    );

    auditFromReq(req, 'CREATE_REPORT_TEMPLATE', 'report_template', id, null, { name });

    res.status(201).json({ message: 'Template created successfully', id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/report-templates/:id - Update template with version snapshot
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const templateId = req.params.id;
  const { name, header_html, footer_html, show_logo, show_qr, show_barcode, show_doctor_signature, show_technician_signature, watermark_text, signature_layout, styles_json, change_reason } = req.body;

  try {
    const existing = await db.queryOne<{ id: string; styles_json: string; header_html: string; footer_html: string }>(
      `SELECT * FROM report_templates WHERE id = $1`,
      [templateId]
    );

    if (!existing) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    // Save version snapshot
    const verCount = await db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM report_template_versions WHERE template_id = $1`,
      [templateId]
    );
    const nextVer = Number(verCount?.count || 0) + 1;

    await db.execute(
      `INSERT INTO report_template_versions (id, template_id, version_number, styles_json, header_html, footer_html, changed_by, reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [`rtv-${uuidv4().substring(0, 8)}`, templateId, nextVer, existing.styles_json, existing.header_html, existing.footer_html, req.user?.id, change_reason || 'Template updated']
    );

    await db.execute(
      `UPDATE report_templates
       SET name = COALESCE($1, name),
           header_html = COALESCE($2, header_html),
           footer_html = COALESCE($3, footer_html),
           show_logo = COALESCE($4, show_logo),
           show_qr = COALESCE($5, show_qr),
           show_barcode = COALESCE($6, show_barcode),
           show_doctor_signature = COALESCE($7, show_doctor_signature),
           show_technician_signature = COALESCE($8, show_technician_signature),
           watermark_text = COALESCE($9, watermark_text),
           signature_layout = COALESCE($10, signature_layout),
           styles_json = COALESCE($11, styles_json)
       WHERE id = $12`,
      [
        name || null, header_html || null, footer_html || null,
        show_logo !== undefined ? (show_logo ? 1 : 0) : null,
        show_qr !== undefined ? (show_qr ? 1 : 0) : null,
        show_barcode !== undefined ? (show_barcode ? 1 : 0) : null,
        show_doctor_signature !== undefined ? (show_doctor_signature ? 1 : 0) : null,
        show_technician_signature !== undefined ? (show_technician_signature ? 1 : 0) : null,
        watermark_text || null, signature_layout || null,
        styles_json ? (typeof styles_json === 'string' ? styles_json : JSON.stringify(styles_json)) : null,
        templateId
      ]
    );

    res.json({ message: 'Template updated and revision snapshot recorded' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/report-templates/:id/clone - Duplicate template
router.post('/:id/clone', authenticateToken, async (req: AuthRequest, res: Response) => {
  const templateId = req.params.id;

  try {
    const original = await db.queryOne<any>(`SELECT * FROM report_templates WHERE id = $1`, [templateId]);
    if (!original) {
      res.status(404).json({ error: 'Original template not found' });
      return;
    }

    const newId = `tpl-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO report_templates (id, lab_id, branch_id, name, is_default, header_html, footer_html, show_logo, show_qr, show_barcode, show_doctor_signature, show_technician_signature, watermark_text, signature_layout, styles_json)
       VALUES ($1, $2, $3, $4, 0, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        newId, original.lab_id, original.branch_id, `${original.name} (Copy)`,
        original.header_html, original.footer_html,
        original.show_logo, original.show_qr, original.show_barcode,
        original.show_doctor_signature, original.show_technician_signature,
        original.watermark_text, original.signature_layout, original.styles_json
      ]
    );

    res.status(201).json({ message: 'Template cloned successfully', id: newId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
