import { Router, Response } from 'express';
import db from '../db/database';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireTenant } from '../middleware/tenant';
import { requireRoles } from '../middleware/rbac';
import CrmPricingService from '../services/crmPricingService';
import { auditFromReq } from '../services/auditService';

const router = Router();

const resolveLabId = (req: AuthRequest): string => {
  return req.user?.lab_id || (req.query.lab_id as string) || (req.headers['x-lab-id'] as string) || 'lab-apex';
};

// GET /api/crm/customers - Customer directory
router.get('/customers', authenticateToken, requireTenant, async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);

  try {
    const customers = await db.query<any>(
      `SELECT * FROM crm_customers WHERE lab_id = $1 ORDER BY total_revenue DESC`,
      [labId]
    );
    res.json(customers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/crm/corporate-accounts - List corporate clients
router.get('/corporate-accounts', authenticateToken, requireTenant, async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);

  try {
    const corps = await db.query<any>(
      `SELECT *, current_outstanding as current_balance FROM corporate_accounts WHERE lab_id = $1 ORDER BY company_name ASC`,
      [labId]
    );
    res.json(corps);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/crm/corporate-accounts - Register corporate client
router.post('/corporate-accounts', authenticateToken, requireTenant, requireRoles(['super_admin', 'lab_admin', 'accountant']), async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);
  const { company_name, contact_person, email, phone, billing_address, tax_id, credit_limit, discount_percentage } = req.body;

  if (!company_name) {
    res.status(400).json({ error: 'Company name is required' });
    return;
  }

  try {
    const id = `corp-${uuidv4().substring(0, 8)}`;
    const code = `CORP-${Math.floor(100 + Math.random() * 900)}`;

    await db.execute(
      `INSERT INTO corporate_accounts (id, lab_id, company_name, account_code, contact_person, email, phone, billing_address, tax_id, credit_limit, discount_percentage, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active')`,
      [
        id,
        labId,
        company_name,
        code,
        contact_person || null,
        email || null,
        phone || null,
        billing_address || null,
        tax_id || null,
        credit_limit || 100000.0,
        discount_percentage || 15.0,
      ]
    );

    auditFromReq(req, 'CREATE_CORPORATE_ACCOUNT', 'corporate_account', id, null, { company_name });
    const corp = await db.queryOne(`SELECT * FROM corporate_accounts WHERE id = $1`, [id]);
    res.status(201).json(corp);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/crm/referral-analytics and /api/crm/doctor-referrals - Doctor referral volume & revenue metrics
const handleDoctorReferrals = async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);

  try {
    const doctorStats = await db.query<any>(
      `SELECT d.id, d.id as doctor_id, d.name as doctor_name, 
              COALESCE(d.specialization, 'General Physician') as specialization,
              COALESCE(d.specialization, 'General Physician') as specialty,
              COUNT(o.id) as total_referrals,
              COUNT(o.id) as referral_count,
              COALESCE(SUM(i.net_total), 0) as total_revenue,
              COALESCE(SUM(i.net_total), 0) as total_volume_inr,
              10 as incentive_rate,
              ROUND(COALESCE(SUM(i.net_total), 0) * 0.10, 2) as total_incentive_inr
       FROM doctors d
       LEFT JOIN test_orders o ON o.referring_doctor_id = d.id AND o.lab_id = d.lab_id
       LEFT JOIN invoices i ON i.order_id = o.id
       WHERE d.lab_id = $1
       GROUP BY d.id, d.name, d.specialization
       ORDER BY total_referrals DESC LIMIT 20`,
      [labId]
    );

    res.json({
      disclaimer: 'Administrative Referral Analytics: Provided strictly for capacity planning and operational logistics.',
      doctor_referrals: doctorStats,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

router.get('/referral-analytics', authenticateToken, requireTenant, handleDoctorReferrals);
router.get('/doctor-referrals', authenticateToken, requireTenant, handleDoctorReferrals);

// GET /api/crm/campaigns - Marketing & screening campaigns
router.get('/campaigns', authenticateToken, requireTenant, async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);

  try {
    const campaigns = await db.query<any>(
      `SELECT *, 
              name as title,
              total_leads as leads_generated,
              converted_orders as samples_collected,
              campaign_revenue as revenue_generated
       FROM campaigns 
       WHERE lab_id = $1 
       ORDER BY created_at DESC`,
      [labId]
    );
    res.json(campaigns);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/crm/campaigns - Launch campaign
router.post('/campaigns', authenticateToken, requireTenant, async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);
  const { name, campaign_type, target_audience, discount_percentage, start_date, end_date } = req.body;

  if (!name || !campaign_type) {
    res.status(400).json({ error: 'Campaign name and type are required' });
    return;
  }

  try {
    const id = `cmp-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO campaigns (id, lab_id, name, campaign_type, target_audience, discount_percentage, start_date, end_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')`,
      [
        id,
        labId,
        name,
        campaign_type,
        target_audience || null,
        discount_percentage || 0,
        start_date || new Date().toISOString().split('T')[0],
        end_date || new Date().toISOString().split('T')[0],
      ]
    );

    const cmp = await db.queryOne(`SELECT * FROM campaigns WHERE id = $1`, [id]);
    res.status(201).json(cmp);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/crm/health-camps - Community health camps
router.get('/health-camps', authenticateToken, requireTenant, async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);

  try {
    const camps = await db.query<any>(
      `SELECT * FROM health_camps WHERE lab_id = $1 ORDER BY camp_date DESC`,
      [labId]
    );
    res.json(camps);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/crm/feedback - Customer feedback and rating
router.post('/feedback', authenticateToken, requireTenant, async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);

  if (!req.body.rating) {
    res.status(400).json({ error: 'Rating (1-5) is required' });
    return;
  }

  try {
    const fb = await CrmPricingService.recordFeedback(labId!, req.body);
    res.status(201).json(fb);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/crm/feedback - List feedback & NPS analytics
router.get('/feedback', authenticateToken, requireTenant, async (req: AuthRequest, res: Response) => {
  const labId = resolveLabId(req);

  try {
    const feedbackList = await db.query<any>(
      `SELECT f.*, 
              COALESCE(p.name, 'Patient #' || SUBSTR(COALESCE(f.patient_id, f.id), -4)) as patient_name,
              f.category as feedback_category
       FROM customer_feedback f
       LEFT JOIN patients p ON f.patient_id = p.id
       WHERE f.lab_id = $1 
       ORDER BY f.created_at DESC 
       LIMIT 50`,
      [labId]
    );

    const avgRow = await db.queryOne<{ avg_rating: number; total: number }>(
      `SELECT AVG(rating) as avg_rating, COUNT(*) as total FROM customer_feedback WHERE lab_id = $1`,
      [labId]
    );

    res.json({
      average_rating: Math.round(Number(avgRow?.avg_rating || 0) * 10) / 10,
      total_reviews: Number(avgRow?.total || 0),
      feedback: feedbackList,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
