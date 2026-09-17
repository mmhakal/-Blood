import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { auditFromReq } from '../services/auditService';

const router = Router();

// GET /api/organizations - List organizations
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const orgs = await db.query(
      `SELECT o.*,
              (SELECT COUNT(*) FROM organization_laboratories WHERE organization_id = o.id) as lab_count,
              (SELECT COUNT(*) FROM organization_users WHERE organization_id = o.id) as user_count
       FROM organizations o
       ORDER BY o.name ASC`
    );
    res.json(orgs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/organizations - Create organization (Super Admin only)
router.post('/', authenticateToken, requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  const { name, code, logo_url, billing_currency, contact_email, contact_phone, headquarters_address } = req.body;

  if (!name || !code) {
    res.status(400).json({ error: 'Organization name and unique code are required' });
    return;
  }

  try {
    const id = `org-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO organizations (id, name, code, logo_url, billing_currency, contact_email, contact_phone, headquarters_address, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')`,
      [id, name, code.trim().toUpperCase(), logo_url || '', billing_currency || 'INR', contact_email || '', contact_phone || '', headquarters_address || '']
    );

    auditFromReq(req, 'CREATE_ORGANIZATION', 'organization', id, null, { name, code });
    res.status(201).json({ message: 'Organization created successfully', id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/organizations/:id - Detail view with laboratories & central users
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const org = await db.queryOne(`SELECT * FROM organizations WHERE id = $1`, [req.params.id]);
    if (!org) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }

    const labs = await db.query(
      `SELECT l.id, l.name, l.code, l.city, l.status, ol.is_primary, ol.joined_at,
              (SELECT COUNT(*) FROM branches WHERE lab_id = l.id) as branch_count
       FROM organization_laboratories ol
       JOIN laboratories l ON ol.lab_id = l.id
       WHERE ol.organization_id = $1`,
      [req.params.id]
    );

    const users = await db.query(
      `SELECT u.id, u.name, u.email, ou.role_code, ou.cross_lab_access
       FROM organization_users ou
       JOIN users u ON ou.user_id = u.id
       WHERE ou.organization_id = $1`,
      [req.params.id]
    );

    res.json({ organization: org, laboratories: labs, central_users: users });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/organizations/:id/labs - Link laboratory to organization
router.post('/:id/labs', authenticateToken, requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  const { lab_id, is_primary } = req.body;
  if (!lab_id) {
    res.status(400).json({ error: 'lab_id is required' });
    return;
  }

  try {
    const linkId = `orglab-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO organization_laboratories (id, organization_id, lab_id, is_primary)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (organization_id, lab_id) DO UPDATE SET is_primary = $4`,
      [linkId, req.params.id, lab_id, is_primary ? 1 : 0]
    );

    await db.execute(`UPDATE laboratories SET organization_id = $1 WHERE id = $2`, [req.params.id, lab_id]);

    auditFromReq(req, 'LINK_LAB_TO_ORG', 'organization_laboratories', linkId, null, { org_id: req.params.id, lab_id });
    res.status(201).json({ message: 'Laboratory linked to organization', id: linkId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/organizations/:id/consolidated-analytics - Cross-lab comparison & totals
router.get('/:id/consolidated-analytics', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const labs = await db.query<{ id: string; name: string; code: string }>(
      `SELECT l.id, l.name, l.code
       FROM organization_laboratories ol
       JOIN laboratories l ON ol.lab_id = l.id
       WHERE ol.organization_id = $1`,
      [req.params.id]
    );

    const comparative: any[] = [];
    let totalRevenue = 0;
    let totalOrders = 0;
    let totalPatients = 0;

    for (const lab of labs) {
      const rev = await db.queryOne<{ total: number }>(`SELECT COALESCE(SUM(paid), 0) as total FROM invoices WHERE lab_id = $1`, [lab.id]);
      const ord = await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM test_orders WHERE lab_id = $1`, [lab.id]);
      const pat = await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM patients WHERE lab_id = $1`, [lab.id]);

      const labRev = Number(rev?.total || 0);
      const labOrd = Number(ord?.count || 0);
      const labPat = Number(pat?.count || 0);

      totalRevenue += labRev;
      totalOrders += labOrd;
      totalPatients += labPat;

      comparative.push({
        lab_id: lab.id,
        lab_name: lab.name,
        lab_code: lab.code,
        revenue_inr: labRev,
        orders_count: labOrd,
        patients_count: labPat
      });
    }

    res.json({
      organization_id: req.params.id,
      total_member_labs: labs.length,
      consolidated: {
        total_revenue_inr: totalRevenue,
        total_orders_count: totalOrders,
        total_patients_count: totalPatients
      },
      comparative
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
