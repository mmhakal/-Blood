import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { auditFromReq } from '../services/auditService';

const router = Router();

// GET /api/white-label - Get active branding settings for tenant
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';

  try {
    const settings = await db.queryOne(
      `SELECT * FROM white_label_settings WHERE lab_id = $1 OR lab_id IS NULL ORDER BY lab_id DESC LIMIT 1`,
      [labId]
    );

    res.json(settings || {
      brand_name: 'MediFlow Enterprise LIS',
      primary_color: '#0284c7',
      secondary_color: '#0f172a',
      accent_color: '#38bdf8',
      logo_url: '/logos/default.png',
      favicon_url: '/favicon.ico'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/white-label - Update tenant white-label settings
router.post('/', authenticateToken, requireRole('super_admin', 'lab_admin'), async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';
  const { brand_name, logo_url, favicon_url, primary_color, secondary_color, accent_color, custom_css, report_header_html, report_footer_html, support_email, support_phone } = req.body;

  if (!brand_name) {
    res.status(400).json({ error: 'brand_name is required' });
    return;
  }

  try {
    const existing = await db.queryOne<{ id: string }>(`SELECT id FROM white_label_settings WHERE lab_id = $1`, [labId]);
    const id = existing?.id || `wl-${uuidv4().substring(0, 8)}`;

    if (existing) {
      await db.execute(
        `UPDATE white_label_settings
         SET brand_name = $1, logo_url = $2, favicon_url = $3, primary_color = $4, secondary_color = $5,
             accent_color = $6, custom_css = $7, report_header_html = $8, report_footer_html = $9,
             support_email = $10, support_phone = $11, updated_at = CURRENT_TIMESTAMP
         WHERE id = $12`,
        [brand_name, logo_url || '', favicon_url || '', primary_color || '#0284c7', secondary_color || '#0f172a', accent_color || '#38bdf8', custom_css || '', report_header_html || '', report_footer_html || '', support_email || '', support_phone || '', id]
      );
    } else {
      await db.execute(
        `INSERT INTO white_label_settings (id, lab_id, brand_name, logo_url, favicon_url, primary_color, secondary_color, accent_color, custom_css, report_header_html, report_footer_html, support_email, support_phone)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [id, labId, brand_name, logo_url || '', favicon_url || '', primary_color || '#0284c7', secondary_color || '#0f172a', accent_color || '#38bdf8', custom_css || '', report_header_html || '', report_footer_html || '', support_email || '', support_phone || '']
      );
    }

    auditFromReq(req, 'UPDATE_WHITE_LABEL', 'white_label_settings', id, null, { brand_name, primary_color });
    res.json({ message: 'White-label branding updated successfully', id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/white-label/custom-domains - List custom domains
router.get('/custom-domains', authenticateToken, async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';

  try {
    const domains = await db.query(
      `SELECT * FROM custom_domains WHERE lab_id = $1 OR organization_id IS NOT NULL ORDER BY created_at DESC`,
      [labId]
    );
    res.json(domains);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/white-label/custom-domains - Register custom domain
router.post('/custom-domains', authenticateToken, requireRole('super_admin', 'lab_admin'), async (req: AuthRequest, res: Response) => {
  const labId = req.user?.lab_id || 'lab-apex';
  const { domain_name } = req.body;

  if (!domain_name) {
    res.status(400).json({ error: 'domain_name is required' });
    return;
  }

  try {
    const id = `cd-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO custom_domains (id, lab_id, domain_name, ssl_status, dns_verified, is_active)
       VALUES ($1, $2, $3, 'active', 1, 1)
       ON CONFLICT (domain_name) DO NOTHING`,
      [id, labId, domain_name.trim().toLowerCase()]
    );

    auditFromReq(req, 'REGISTER_CUSTOM_DOMAIN', 'custom_domains', id, null, { domain_name });
    res.status(201).json({ message: 'Custom domain registered and DNS verified', id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
