import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { auditFromReq } from '../services/auditService';
import { createNotification } from '../services/notificationService';

const router = Router();

// GET /api/subscriptions/plans - list subscription plans
router.get('/plans', async (req: AuthRequest, res: Response) => {
  try {
    const showAll = req.query.all === 'true';
    const query = showAll
      ? `SELECT * FROM subscription_plans WHERE deleted_at IS NULL ORDER BY price ASC`
      : `SELECT * FROM subscription_plans WHERE is_active = 1 AND deleted_at IS NULL ORDER BY price ASC`;

    const plans = await db.query(query);
    const parsed = plans.map(p => ({
      ...p,
      features: typeof p.features === 'string' ? JSON.parse(p.features || '[]') : (p.features || [])
    }));
    res.json(parsed);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subscriptions/plans - Super Admin creates plan
router.post('/plans', authenticateToken, requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  const { name, code, description, max_branches, max_users, max_patients_per_month, max_reports_per_month, storage_limit_mb, duration_days, price, features } = req.body;

  if (!name || !code) {
    res.status(400).json({ error: 'Plan name and code are required' });
    return;
  }

  try {
    const id = `plan-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO subscription_plans (id, name, code, description, max_branches, max_users, max_patients_per_month, max_reports_per_month, storage_limit_mb, duration_days, price, features, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 1)`,
      [
        id, name, code.toUpperCase(), description || '', max_branches || 1, max_users || 5,
        max_patients_per_month || 500, max_reports_per_month || 500, storage_limit_mb || 1024,
        duration_days || 30, price || 0, JSON.stringify(features || [])
      ]
    );

    auditFromReq(req, 'CREATE_SUBSCRIPTION_PLAN', 'subscription_plan', id, null, { name, code });
    res.status(201).json({ message: 'Subscription plan created successfully', id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/subscriptions/plans/:id - Super Admin updates plan
router.put('/plans/:id', authenticateToken, requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  const planId = req.params.id;
  const { name, description, max_branches, max_users, max_patients_per_month, max_reports_per_month, storage_limit_mb, duration_days, price, features, is_active } = req.body;

  try {
    await db.execute(
      `UPDATE subscription_plans
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           max_branches = COALESCE($3, max_branches),
           max_users = COALESCE($4, max_users),
           max_patients_per_month = COALESCE($5, max_patients_per_month),
           max_reports_per_month = COALESCE($6, max_reports_per_month),
           storage_limit_mb = COALESCE($7, storage_limit_mb),
           duration_days = COALESCE($8, duration_days),
           price = COALESCE($9, price),
           features = COALESCE($10, features),
           is_active = COALESCE($11, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $12`,
      [
        name, description, max_branches, max_users, max_patients_per_month, max_reports_per_month,
        storage_limit_mb, duration_days, price, features ? JSON.stringify(features) : null,
        is_active, planId
      ]
    );

    auditFromReq(req, 'UPDATE_SUBSCRIPTION_PLAN', 'subscription_plan', planId, null, req.body);
    res.json({ message: 'Subscription plan updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/subscriptions/plans/:id/status - Activate / deactivate plan
router.patch('/plans/:id/status', authenticateToken, requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  const planId = req.params.id;
  const { is_active } = req.body;

  try {
    await db.execute(
      `UPDATE subscription_plans SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [is_active ? 1 : 0, planId]
    );

    auditFromReq(req, 'TOGGLE_PLAN_STATUS', 'subscription_plan', planId, null, { is_active });
    res.json({ message: `Plan status updated to ${is_active ? 'Active' : 'Inactive'}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/subscriptions/laboratories - List all laboratories with active subscriptions & status
router.get('/laboratories', authenticateToken, requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const labs = await db.query(`
      SELECT l.id, l.name, l.code, l.status as lab_status,
             l.subscription_start, l.subscription_end,
             sp.id as plan_id, sp.name as plan_name, sp.code as plan_code, sp.price as plan_price,
             (SELECT COUNT(*) FROM branches WHERE lab_id = l.id AND deleted_at IS NULL) as branches_count,
             (SELECT COUNT(*) FROM users WHERE lab_id = l.id AND deleted_at IS NULL) as users_count
      FROM laboratories l
      LEFT JOIN subscription_plans sp ON l.subscription_plan_id = sp.id
      WHERE l.deleted_at IS NULL
      ORDER BY l.subscription_end ASC
    `);

    const enriched = labs.map(lab => {
      let subState = 'active';
      let daysRemaining = 0;

      if (lab.lab_status === 'suspended') {
        subState = 'suspended';
      } else if (lab.subscription_end) {
        const expiry = new Date(lab.subscription_end);
        const now = new Date();
        daysRemaining = Math.ceil((expiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

        if (daysRemaining < 0) {
          subState = 'expired';
        } else if (daysRemaining <= 15) {
          subState = 'expiring_soon';
        } else if (lab.plan_code === 'TRIAL') {
          subState = 'trial';
        } else {
          subState = 'active';
        }
      }

      return {
        ...lab,
        subscription_state: subState,
        days_remaining: daysRemaining
      };
    });

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subscriptions/assign - Assign or switch plan for laboratory
router.post('/assign', authenticateToken, requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  const { lab_id, plan_id, duration_days, price_paid, notes } = req.body;

  if (!lab_id || !plan_id) {
    res.status(400).json({ error: 'Laboratory ID and Plan ID are required' });
    return;
  }

  try {
    const plan = await db.queryOne<{ id: string; name: string; duration_days: number; price: number }>(
      `SELECT * FROM subscription_plans WHERE id = $1`,
      [plan_id]
    );

    if (!plan) {
      res.status(404).json({ error: 'Plan not found' });
      return;
    }

    const days = duration_days || plan.duration_days || 30;
    const now = new Date();
    const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    await db.execute(
      `UPDATE laboratories
       SET subscription_plan_id = $1,
           subscription_start = $2,
           subscription_end = $3,
           status = 'active',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [plan_id, now.toISOString(), end.toISOString(), lab_id]
    );

    const subHistoryId = `sub-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO subscriptions (id, lab_id, plan_id, status, start_date, end_date, price_paid, notes, created_by)
       VALUES ($1, $2, $3, 'active', $4, $5, $6, $7, $8)`,
      [subHistoryId, lab_id, plan_id, now.toISOString(), end.toISOString(), price_paid ?? plan.price, notes || 'Plan assigned by Super Admin', req.user?.id]
    );

    await createNotification({
      lab_id,
      title: '📋 Subscription Updated',
      message: `Your facility has been enrolled in the '${plan.name}' plan, active until ${end.toLocaleDateString()}.`,
      type: 'success',
      link: '/subscriptions'
    });

    auditFromReq(req, 'ASSIGN_SUBSCRIPTION', 'subscription', subHistoryId, null, { lab_id, plan_id, plan_name: plan.name, days });
    res.json({ message: 'Subscription assigned and activated successfully', expiry: end.toISOString() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subscriptions/extend - Extend existing subscription by days
router.post('/extend', authenticateToken, requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  const { lab_id, extension_days, notes } = req.body;

  if (!lab_id || !extension_days) {
    res.status(400).json({ error: 'Laboratory ID and extension days are required' });
    return;
  }

  try {
    const lab = await db.queryOne<{ subscription_end: string; subscription_plan_id: string }>(
      `SELECT subscription_end, subscription_plan_id FROM laboratories WHERE id = $1`,
      [lab_id]
    );

    if (!lab) {
      res.status(404).json({ error: 'Laboratory not found' });
      return;
    }

    const currentEnd = lab.subscription_end ? new Date(lab.subscription_end) : new Date();
    const baseDate = currentEnd > new Date() ? currentEnd : new Date();
    const newEnd = new Date(baseDate.getTime() + Number(extension_days) * 24 * 60 * 60 * 1000);

    await db.execute(
      `UPDATE laboratories
       SET subscription_end = $1, status = 'active', updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [newEnd.toISOString(), lab_id]
    );

    const subId = `sub-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO subscriptions (id, lab_id, plan_id, status, start_date, end_date, price_paid, notes, created_by)
       VALUES ($1, $2, $3, 'active', $4, $5, 0, $6, $7)`,
      [subId, lab_id, lab.subscription_plan_id, new Date().toISOString(), newEnd.toISOString(), notes || `Extended by ${extension_days} days`, req.user?.id]
    );

    await createNotification({
      lab_id,
      title: '⏳ Subscription Extended',
      message: `Your subscription has been extended by ${extension_days} days until ${newEnd.toLocaleDateString()}.`,
      type: 'info',
      link: '/subscriptions'
    });

    auditFromReq(req, 'EXTEND_SUBSCRIPTION', 'subscription', subId, null, { lab_id, extension_days, new_expiry: newEnd.toISOString() });
    res.json({
      message: `Subscription extended by ${extension_days} days`,
      new_expiry: newEnd.toISOString(),
      new_end_date: newEnd.toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subscriptions/renew - Renew current plan for another standard term
router.post('/renew', authenticateToken, requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  const { lab_id, billing_cycle } = req.body;

  if (!lab_id) {
    res.status(400).json({ error: 'Laboratory ID is required' });
    return;
  }

  try {
    const lab = await db.queryOne<{ subscription_plan_id: string; subscription_end: string }>(
      `SELECT subscription_plan_id, subscription_end FROM laboratories WHERE id = $1`,
      [lab_id]
    );

    if (!lab || !lab.subscription_plan_id) {
      res.status(400).json({ error: 'Laboratory does not have an assigned plan to renew' });
      return;
    }

    const plan = await db.queryOne<{ name: string; duration_days: number; price: number }>(
      `SELECT name, duration_days, price FROM subscription_plans WHERE id = $1`,
      [lab.subscription_plan_id]
    );

    const days = plan?.duration_days || 30;
    const currentEnd = lab.subscription_end ? new Date(lab.subscription_end) : new Date();
    const baseDate = currentEnd > new Date() ? currentEnd : new Date();
    const newEnd = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

    await db.execute(
      `UPDATE laboratories SET subscription_end = $1, status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [newEnd.toISOString(), lab_id]
    );

    const subId = `sub-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO subscriptions (id, lab_id, plan_id, status, start_date, end_date, price_paid, billing_cycle, notes, created_by)
       VALUES ($1, $2, $3, 'active', $4, $5, $6, $7, 'Subscription renewal', $8)`,
      [subId, lab_id, lab.subscription_plan_id, new Date().toISOString(), newEnd.toISOString(), plan?.price || 0, billing_cycle || 'monthly', req.user?.id]
    );

    await createNotification({
      lab_id,
      title: '🎉 Subscription Renewed',
      message: `Your ${plan?.name} subscription has been renewed until ${newEnd.toLocaleDateString()}.`,
      type: 'success',
      link: '/subscriptions'
    });

    auditFromReq(req, 'RENEW_SUBSCRIPTION', 'subscription', subId, null, { lab_id, new_expiry: newEnd.toISOString() });
    res.json({ message: 'Subscription renewed successfully', new_expiry: newEnd.toISOString() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subscriptions/suspend - Suspend laboratory subscription
router.post('/suspend', authenticateToken, requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  const { lab_id, reason } = req.body;

  if (!lab_id) {
    res.status(400).json({ error: 'Laboratory ID is required' });
    return;
  }

  try {
    await db.execute(
      `UPDATE laboratories SET status = 'suspended', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [lab_id]
    );

    await createNotification({
      lab_id,
      title: '⛔ Subscription Suspended',
      message: `Your laboratory subscription has been suspended by Super Admin. Reason: ${reason || 'Billing / Compliance notice'}.`,
      type: 'danger',
      link: '/dashboard'
    });

    auditFromReq(req, 'SUSPEND_SUBSCRIPTION', 'laboratory', lab_id, null, { reason });
    res.json({ message: 'Laboratory subscription suspended successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

