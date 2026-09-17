import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import db from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { auditFromReq } from '../services/auditService';
import { createNotification } from '../services/notificationService';

const router = Router();

// GET /api/laboratories - Super Admin lists laboratories with search, filters, pagination
router.get('/', authenticateToken, requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const search = req.query.search as string;
    const status = req.query.status as string;
    const planId = req.query.plan_id as string;

    let whereClause = `WHERE (l.deleted_at IS NULL)`;
    const params: any[] = [];

    if (search) {
      params.push(`%${search.trim().toLowerCase()}%`);
      whereClause += ` AND (LOWER(l.name) LIKE $${params.length} OR LOWER(l.code) LIKE $${params.length} OR LOWER(l.city) LIKE $${params.length} OR LOWER(l.email) LIKE $${params.length})`;
    }

    if (status && status !== 'all') {
      params.push(status);
      whereClause += ` AND (l.status = $${params.length})`;
    }

    if (planId && planId !== 'all') {
      params.push(planId);
      whereClause += ` AND (l.subscription_plan_id = $${params.length})`;
    }

    const labs = await db.query(`
      SELECT l.*,
             sp.name as plan_name, sp.code as plan_code,
             (SELECT COUNT(*) FROM branches WHERE lab_id = l.id AND deleted_at IS NULL) as branch_count,
             (SELECT COUNT(*) FROM users WHERE lab_id = l.id AND deleted_at IS NULL) as user_count,
             (SELECT COUNT(*) FROM patients WHERE lab_id = l.id) as patient_count,
             (SELECT COUNT(*) FROM test_orders WHERE lab_id = l.id) as order_count
      FROM laboratories l
      LEFT JOIN subscription_plans sp ON l.subscription_plan_id = sp.id
      ${whereClause}
      ORDER BY l.created_at DESC
    `, params);

    res.json(labs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/laboratories/:id - Get full lab details, branches, staff, stats
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const labId = req.params.id;
    if (req.user?.role_code !== 'super_admin' && req.user?.lab_id !== labId) {
      res.status(403).json({ error: 'Unauthorized to view this laboratory' });
      return;
    }

    const lab = await db.queryOne(
      `SELECT l.*, sp.name as plan_name, sp.code as plan_code, sp.price as plan_price, sp.features as plan_features
       FROM laboratories l
       LEFT JOIN subscription_plans sp ON l.subscription_plan_id = sp.id
       WHERE l.id = $1 AND l.deleted_at IS NULL`,
      [labId]
    );

    if (!lab) {
      res.status(404).json({ error: 'Laboratory not found or deleted' });
      return;
    }

    const branches = await db.query(`SELECT * FROM branches WHERE lab_id = $1 AND deleted_at IS NULL ORDER BY created_at ASC`, [labId]);
    const staff = await db.query(
      `SELECT u.id, u.name, u.email, u.phone, u.status, u.last_login_at, u.created_at,
              r.name as role_name, r.code as role_code, b.name as branch_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN branches b ON u.branch_id = b.id
       WHERE u.lab_id = $1 AND u.deleted_at IS NULL
       ORDER BY u.created_at DESC`,
      [labId]
    );

    const subscriptionHistory = await db.query(
      `SELECT s.*, sp.name as plan_name, sp.code as plan_code
       FROM subscriptions s
       JOIN subscription_plans sp ON s.plan_id = sp.id
       WHERE s.lab_id = $1
       ORDER BY s.created_at DESC`,
      [labId]
    );

    const stats = {
      total_patients: Number((await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM patients WHERE lab_id = $1`, [labId]))?.count || 0),
      total_orders: Number((await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM test_orders WHERE lab_id = $1`, [labId]))?.count || 0),
      total_revenue: Number((await db.queryOne<{ total: number }>(`SELECT SUM(net_total) as total FROM invoices WHERE lab_id = $1`, [labId]))?.total || 0)
    };

    res.json({ lab, branches, staff, subscription_history: subscriptionHistory, stats });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/laboratories - Super Admin creates laboratory + optional initial Lab Admin
router.post('/', authenticateToken, requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  const {
    name, code, owner_name, email, phone, address, city, state, country,
    tax_number, license_number, subscription_plan_id,
    create_admin, admin_name, admin_email, admin_phone, admin_password
  } = req.body;

  if (!name || !code || !email || !owner_name) {
    res.status(400).json({ error: 'Name, code, owner name, and email are required' });
    return;
  }

  try {
    // Check if code or email already exists
    const existingCode = await db.queryOne(`SELECT id FROM laboratories WHERE UPPER(code) = UPPER($1) AND deleted_at IS NULL`, [code.trim()]);
    if (existingCode) {
      res.status(409).json({ error: `A laboratory with code '${code.toUpperCase()}' already exists` });
      return;
    }

    const labId = `lab-${uuidv4().substring(0, 8)}`;
    const now = new Date();
    const planId = subscription_plan_id || 'plan-trial';

    // Fetch plan details for duration
    const plan = await db.queryOne<{ duration_days: number; price: number }>(
      `SELECT duration_days, price FROM subscription_plans WHERE id = $1`,
      [planId]
    );
    const durationDays = plan ? plan.duration_days : 30;
    const subEnd = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    await db.execute(
      `INSERT INTO laboratories (id, name, code, owner_name, email, phone, address, city, state, country, tax_number, license_number, status, subscription_plan_id, subscription_start, subscription_end, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active', $13, $14, $15, $16)`,
      [
        labId, name.trim(), code.trim().toUpperCase(), owner_name.trim(), email.trim(), phone || '', address || '',
        city || '', state || '', country || 'India', tax_number || '', license_number || '',
        planId, now.toISOString(), subEnd.toISOString(), req.user?.id
      ]
    );

    // Initial Subscription record
    const subId = `sub-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO subscriptions (id, lab_id, plan_id, status, start_date, end_date, price_paid, billing_cycle, notes, created_by)
       VALUES ($1, $2, $3, 'active', $4, $5, $6, 'monthly', 'Initial provisioning subscription', $7)`,
      [subId, labId, planId, now.toISOString(), subEnd.toISOString(), plan ? plan.price : 0, req.user?.id]
    );

    // Create Default Main Hub Branch
    const branchId = `branch-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO branches (id, lab_id, name, code, address, phone, email, manager_name, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [branchId, labId, `${name} (Main Center)`, `${code.trim().toUpperCase()}-01`, address || '', phone || '', email, owner_name, req.user?.id]
    );

    // Optional: Create initial Lab Admin user
    let createdAdminUser = null;
    const shouldCreateAdmin = create_admin !== false && (admin_email || email);
    if (shouldCreateAdmin) {
      const targetAdminEmail = (admin_email || email).trim();
      const targetAdminName = (admin_name || owner_name).trim();
      const targetPassword = admin_password || 'admin123';
      const passwordHash = bcrypt.hashSync(targetPassword, 10);

      // Verify email not taken
      const existingUser = await db.queryOne(`SELECT id FROM users WHERE LOWER(email) = LOWER($1)`, [targetAdminEmail]);
      if (!existingUser) {
        const adminId = `user-${uuidv4().substring(0, 8)}`;
        const labAdminRole = await db.queryOne<{ id: string }>(`SELECT id FROM roles WHERE code = 'lab_admin'`);
        const roleId = labAdminRole ? labAdminRole.id : 'role-labadmin';

        await db.execute(
          `INSERT INTO users (id, lab_id, branch_id, name, email, password_hash, phone, role_id, status, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9)`,
          [adminId, labId, branchId, targetAdminName, targetAdminEmail, passwordHash, admin_phone || phone || '', roleId, req.user?.id]
        );

        // Assign to branch
        await db.execute(
          `INSERT INTO user_branches (user_id, branch_id, is_primary) VALUES ($1, $2, 1)`,
          [adminId, branchId]
        );

        createdAdminUser = {
          id: adminId,
          name: targetAdminName,
          email: targetAdminEmail,
          role: 'lab_admin'
        };

        // Welcome notification
        await createNotification({
          lab_id: labId,
          user_id: adminId,
          title: '🎉 Welcome to MediFlow LIS',
          message: `Your clinical workspace for ${name} has been provisioned. Universal default password: admin123.`,
          type: 'success',
          link: '/dashboard'
        });
      }
    }

    // System notification for Super Admin
    await createNotification({
      lab_id: null,
      user_id: null,
      title: '🏥 New Laboratory Onboarded',
      message: `${name} (${code.toUpperCase()}) was successfully created by ${req.user?.name}.`,
      type: 'info',
      link: `/laboratories/${labId}`
    });

    auditFromReq(req, 'CREATE_LABORATORY', 'laboratory', labId, null, { name, code, plan_id: planId, admin_created: Boolean(createdAdminUser) });

    res.status(201).json({
      message: 'Laboratory created successfully',
      id: labId,
      branch_id: branchId,
      admin_user: createdAdminUser
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/laboratories/:id/status - Super Admin activates / suspends / deactivates lab
router.patch('/:id/status', authenticateToken, requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  const { status } = req.body; // active, suspended, deactivated
  const labId = req.params.id as string;

  if (!['active', 'suspended', 'deactivated'].includes(status)) {
    res.status(400).json({ error: "Invalid status. Must be 'active', 'suspended', or 'deactivated'." });
    return;
  }

  try {
    const oldLab = await db.queryOne<{ status: string; name: string }>(`SELECT status, name FROM laboratories WHERE id = $1`, [labId]);
    if (!oldLab) {
      res.status(404).json({ error: 'Laboratory not found' });
      return;
    }

    await db.execute(
      `UPDATE laboratories SET status = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [status, req.user?.id, labId]
    );

    // Notify lab members
    await createNotification({
      lab_id: labId,
      title: status === 'active' ? '✅ Facility Activated' : '⚠️ Facility Status Notice',
      message: `Your laboratory account status has been updated to ${status.toUpperCase()} by Super Admin.`,
      type: status === 'active' ? 'success' : 'danger',
      link: '/dashboard'
    });

    auditFromReq(req, 'UPDATE_LAB_STATUS', 'laboratory', labId, { status: oldLab.status }, { status });
    res.json({ message: `Laboratory status updated to ${status}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/laboratories/:id - Update laboratory profile
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const labId = req.params.id as string;
  if (req.user?.role_code !== 'super_admin' && req.user?.lab_id !== labId) {
    res.status(403).json({ error: 'Unauthorized to update this laboratory' });
    return;
  }

  const { name, owner_name, email, phone, address, city, state, country, tax_number, license_number, header_text, footer_text, logo_url } = req.body;

  try {
    await db.execute(
      `UPDATE laboratories
       SET name = COALESCE($1, name),
           owner_name = COALESCE($2, owner_name),
           email = COALESCE($3, email),
           phone = COALESCE($4, phone),
           address = COALESCE($5, address),
           city = COALESCE($6, city),
           state = COALESCE($7, state),
           country = COALESCE($8, country),
           tax_number = COALESCE($9, tax_number),
           license_number = COALESCE($10, license_number),
           header_text = COALESCE($11, header_text),
           footer_text = COALESCE($12, footer_text),
           logo_url = COALESCE($13, logo_url),
           updated_by = $14,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $15`,
      [name, owner_name, email, phone, address, city, state, country, tax_number, license_number, header_text, footer_text, logo_url, req.user?.id, labId]
    );

    auditFromReq(req, 'UPDATE_LABORATORY', 'laboratory', labId, null, req.body);
    res.json({ message: 'Laboratory details updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/laboratories/:id - Super Admin soft-deletes a laboratory
router.delete('/:id', authenticateToken, requireRole('super_admin'), async (req: AuthRequest, res: Response) => {
  const labId = req.params.id as string;
  try {
    await db.execute(
      `UPDATE laboratories SET deleted_at = CURRENT_TIMESTAMP, status = 'deactivated', updated_by = $1 WHERE id = $2`,
      [req.user?.id, labId]
    );

    auditFromReq(req, 'DELETE_LABORATORY', 'laboratory', labId);
    res.json({ message: 'Laboratory deactivated and archived successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

