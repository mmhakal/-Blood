import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { auditFromReq } from '../services/auditService';

const router = Router();

// GET /api/branches - list branches
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const labId = req.query.lab_id as string || req.user?.lab_id;
    const search = req.query.search as string;
    const status = req.query.status as string;

    if (req.user?.role_code !== 'super_admin' && (!labId || labId !== req.user?.lab_id)) {
      res.status(403).json({ error: 'Unauthorized branch access: Cross-tenant access denied' });
      return;
    }

    let query = `
      SELECT b.*,
             (SELECT COUNT(*) FROM user_branches WHERE branch_id = b.id) as user_count,
             (SELECT COUNT(*) FROM patients WHERE branch_id = b.id) as patient_count,
             (SELECT COUNT(*) FROM test_orders WHERE branch_id = b.id) as order_count
      FROM branches b
      WHERE 1=1
    `;
    const params: any[] = [];

    if (labId) {
      params.push(labId);
      query += ` AND b.lab_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND b.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const idx = params.length;
      query += ` AND (LOWER(b.name) LIKE $${idx} OR LOWER(b.code) LIKE $${idx} OR LOWER(b.city) LIKE $${idx})`;
    }

    query += ` ORDER BY b.created_at ASC`;

    const branches = await db.query(query, params);
    res.json(branches);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/branches/:id - single branch details with stats and staff
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const branchId = req.params.id;
    const branch = await db.queryOne<any>(`SELECT * FROM branches WHERE id = $1`, [branchId]);

    if (!branch) {
      res.status(404).json({ error: 'Branch not found' });
      return;
    }

    // Tenant Isolation
    if (req.user?.role_code !== 'super_admin' && branch.lab_id !== req.user?.lab_id) {
      res.status(403).json({ error: 'Unauthorized access to branch belonging to another laboratory' });
      return;
    }

    // Branch staff roster
    const staff = await db.query(
      `SELECT u.id, u.name, u.email, u.phone, u.status, r.name as role_name, r.code as role_code, ub.is_primary
       FROM users u
       JOIN user_branches ub ON u.id = ub.user_id
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE ub.branch_id = $1
       ORDER BY ub.is_primary DESC, u.name ASC`,
      [branchId]
    );

    // Metrics
    const patientCount = await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM patients WHERE branch_id = $1`, [branchId]);
    const orderCount = await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM test_orders WHERE branch_id = $1`, [branchId]);
    const revenueSum = await db.queryOne<{ sum: number }>(
      `SELECT COALESCE(SUM(p.amount), 0) as sum FROM payments p JOIN invoices i ON p.invoice_id = i.id WHERE i.branch_id = $1`,
      [branchId]
    );

    res.json({
      branch,
      staff,
      stats: {
        patient_count: parseInt(patientCount?.count as any || '0'),
        order_count: parseInt(orderCount?.count as any || '0'),
        total_revenue: parseFloat(revenueSum?.sum as any || '0')
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/branches - create new branch
router.post('/', authenticateToken, requirePermission('manage_branches'), async (req: AuthRequest, res: Response) => {
  const {
    name, code, address, phone, alternate_phone, email, manager_name,
    city, state, country, pincode, tax_number, registration_number,
    working_hours, logo_url, report_header, report_footer
  } = req.body;
  const labId = req.body.lab_id || req.user?.lab_id;

  if (req.user?.role_code !== 'super_admin' && req.body.lab_id && req.body.lab_id !== req.user?.lab_id) {
    res.status(403).json({ error: 'Tenant Security Violation: Cannot create branches for another laboratory.' });
    return;
  }

  if (!name || !code || !labId) {
    res.status(400).json({ error: 'Branch name, code, and laboratory ID are required' });
    return;
  }

  try {
    // Prevent duplicate branch code within the same laboratory
    const existing = await db.queryOne(
      `SELECT id FROM branches WHERE lab_id = $1 AND UPPER(code) = UPPER($2)`,
      [labId, code.trim()]
    );
    if (existing) {
      res.status(409).json({ error: `Branch code '${code.toUpperCase()}' already exists in this laboratory.` });
      return;
    }

    const branchId = `branch-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO branches (
        id, lab_id, name, code, address, phone, alternate_phone, email, manager_name,
        city, state, country, pincode, tax_number, registration_number,
        working_hours, logo_url, report_header, report_footer, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, 'active', $20)`,
      [
        branchId, labId, name.trim(), code.trim().toUpperCase(), address || '', phone || '',
        alternate_phone || '', email || '', manager_name || '', city || '', state || '',
        country || 'India', pincode || '', tax_number || '', registration_number || '',
        working_hours || '7:00 AM - 9:00 PM', logo_url || '', report_header || '', report_footer || '',
        req.user?.id || null
      ]
    );

    auditFromReq(req, 'CREATE_BRANCH', 'branch', branchId, null, { name, code: code.toUpperCase() });
    res.status(201).json({ message: 'Branch created successfully', id: branchId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/branches/:id - update branch
router.put('/:id', authenticateToken, requirePermission('manage_branches'), async (req: AuthRequest, res: Response) => {
  const branchId = req.params.id as string;
  const {
    name, code, address, phone, alternate_phone, email, manager_name,
    city, state, country, pincode, tax_number, registration_number,
    working_hours, logo_url, report_header, report_footer, status
  } = req.body;

  try {
    const branch = await db.queryOne<any>(`SELECT * FROM branches WHERE id = $1`, [branchId]);
    if (!branch) {
      res.status(404).json({ error: 'Branch not found' });
      return;
    }

    if (req.user?.role_code !== 'super_admin' && branch.lab_id !== req.user?.lab_id) {
      res.status(403).json({ error: 'Tenant Security Violation: Cannot edit branch of another laboratory.' });
      return;
    }

    // If code is being changed, verify uniqueness within the lab
    if (code && code.toUpperCase() !== branch.code) {
      const codeExists = await db.queryOne(
        `SELECT id FROM branches WHERE lab_id = $1 AND UPPER(code) = UPPER($2) AND id != $3`,
        [branch.lab_id, code.trim(), branchId]
      );
      if (codeExists) {
        res.status(409).json({ error: `Branch code '${code.toUpperCase()}' is already used by another branch.` });
        return;
      }
    }

    await db.execute(
      `UPDATE branches
       SET name = COALESCE($1, name),
           code = COALESCE($2, code),
           address = COALESCE($3, address),
           phone = COALESCE($4, phone),
           alternate_phone = COALESCE($5, alternate_phone),
           email = COALESCE($6, email),
           manager_name = COALESCE($7, manager_name),
           city = COALESCE($8, city),
           state = COALESCE($9, state),
           country = COALESCE($10, country),
           pincode = COALESCE($11, pincode),
           tax_number = COALESCE($12, tax_number),
           registration_number = COALESCE($13, registration_number),
           working_hours = COALESCE($14, working_hours),
           logo_url = COALESCE($15, logo_url),
           report_header = COALESCE($16, report_header),
           report_footer = COALESCE($17, report_footer),
           status = COALESCE($18, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $19`,
      [
        name, code ? code.toUpperCase() : null, address, phone, alternate_phone, email, manager_name,
        city, state, country, pincode, tax_number, registration_number, working_hours,
        logo_url, report_header, report_footer, status, branchId
      ]
    );

    auditFromReq(req, 'UPDATE_BRANCH', 'branch', branchId, branch, req.body);
    res.json({ message: 'Branch updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/branches/:id/status - toggle active / inactive
router.patch('/:id/status', authenticateToken, requirePermission('manage_branches'), async (req: AuthRequest, res: Response) => {
  const branchId = req.params.id as string;
  const { status } = req.body;

  if (!status || !['active', 'inactive'].includes(status)) {
    res.status(400).json({ error: 'Valid status (active or inactive) is required' });
    return;
  }

  try {
    const branch = await db.queryOne<any>(`SELECT * FROM branches WHERE id = $1`, [branchId]);
    if (!branch) {
      res.status(404).json({ error: 'Branch not found' });
      return;
    }

    if (req.user?.role_code !== 'super_admin' && branch.lab_id !== req.user?.lab_id) {
      res.status(403).json({ error: 'Tenant Security Violation: Cannot alter branch of another laboratory.' });
      return;
    }

    await db.execute(`UPDATE branches SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [status, branchId]);
    auditFromReq(req, 'STATUS_CHANGE_BRANCH', 'branch', branchId, { status: branch.status }, { status });

    res.json({ message: `Branch status successfully updated to '${status}'` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/branches/:id/users - list users assigned to branch
router.get('/:id/users', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const branchId = req.params.id;
    const branch = await db.queryOne<any>(`SELECT lab_id FROM branches WHERE id = $1`, [branchId]);
    if (!branch) {
      res.status(404).json({ error: 'Branch not found' });
      return;
    }

    if (req.user?.role_code !== 'super_admin' && branch.lab_id !== req.user?.lab_id) {
      res.status(403).json({ error: 'Cross-tenant access forbidden' });
      return;
    }

    const assignedUsers = await db.query(
      `SELECT u.id, u.name, u.email, u.phone, u.status, r.name as role_name, r.code as role_code, ub.is_primary
       FROM users u
       JOIN user_branches ub ON u.id = ub.user_id
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE ub.branch_id = $1
       ORDER BY ub.is_primary DESC, u.name ASC`,
      [branchId]
    );

    res.json(assignedUsers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/branches/:id/users - assign user to branch
router.post('/:id/users', authenticateToken, requirePermission('manage_branches'), async (req: AuthRequest, res: Response) => {
  const branchId = req.params.id;
  const { user_id, is_primary } = req.body;

  if (!user_id) {
    res.status(400).json({ error: 'User ID is required' });
    return;
  }

  try {
    const branch = await db.queryOne<any>(`SELECT lab_id FROM branches WHERE id = $1`, [branchId]);
    const targetUser = await db.queryOne<any>(`SELECT lab_id, name FROM users WHERE id = $1`, [user_id]);

    if (!branch || !targetUser) {
      res.status(404).json({ error: 'Branch or user not found' });
      return;
    }

    // Ensure tenant consistency
    if (req.user?.role_code !== 'super_admin' && (branch.lab_id !== req.user?.lab_id || targetUser.lab_id !== req.user?.lab_id)) {
      res.status(403).json({ error: 'Tenant Security Violation: Cannot assign cross-tenant users.' });
      return;
    }

    if (is_primary) {
      // Clear previous primary flag for this user
      await db.execute(`UPDATE user_branches SET is_primary = 0 WHERE user_id = $1`, [user_id]);
      await db.execute(`UPDATE users SET branch_id = $1 WHERE id = $2`, [branchId, user_id]);
    }

    await db.execute(
      `INSERT INTO user_branches (user_id, branch_id, is_primary)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, branch_id) DO UPDATE SET is_primary = EXCLUDED.is_primary`,
      [user_id, branchId, is_primary ? 1 : 0]
    );

    auditFromReq(req, 'ASSIGN_BRANCH_USER', 'user_branches', user_id, null, { branch_id: branchId, is_primary });
    res.status(201).json({ message: `User '${targetUser.name}' assigned to branch successfully` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/branches/:id/users/:userId - remove user from branch
router.delete('/:id/users/:userId', authenticateToken, requirePermission('manage_branches'), async (req: AuthRequest, res: Response) => {
  const { id: branchId, userId } = req.params;

  try {
    const branch = await db.queryOne<any>(`SELECT lab_id FROM branches WHERE id = $1`, [branchId]);
    if (!branch) {
      res.status(404).json({ error: 'Branch not found' });
      return;
    }

    if (req.user?.role_code !== 'super_admin' && branch.lab_id !== req.user?.lab_id) {
      res.status(403).json({ error: 'Tenant Security Violation: Cross-tenant branch modification prohibited.' });
      return;
    }

    await db.execute(`DELETE FROM user_branches WHERE branch_id = $1 AND user_id = $2`, [branchId, userId]);
    auditFromReq(req, 'UNASSIGN_BRANCH_USER', 'user_branches', userId, { branch_id: branchId }, null);

    res.json({ message: 'User unassigned from branch successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
