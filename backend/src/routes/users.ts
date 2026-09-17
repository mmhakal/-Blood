import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import db from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { auditFromReq } from '../services/auditService';

const router = Router();

// GET /api/users/roles - list all available roles
router.get('/roles', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const roles = await db.query(`SELECT * FROM roles ORDER BY is_system DESC, name ASC`);
    const permissions = await db.query(`SELECT * FROM permissions ORDER BY category ASC, name ASC`);
    res.json({ roles, permissions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users - list users
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const labId = req.query.lab_id as string || req.user?.lab_id;

    let users = [];
    if (req.user?.role_code === 'super_admin' && !labId) {
      users = await db.query(`
        SELECT u.id, u.name, u.email, u.phone, u.status, u.last_login_at, u.created_at,
               r.name as role_name, r.code as role_code,
               l.name as lab_name, b.name as branch_name
        FROM users u
        JOIN roles r ON u.role_id = r.id
        LEFT JOIN laboratories l ON u.lab_id = l.id
        LEFT JOIN branches b ON u.branch_id = b.id
        ORDER BY u.created_at DESC
      `);
    } else {
      users = await db.query(
        `SELECT u.id, u.name, u.email, u.phone, u.status, u.last_login_at, u.created_at,
                r.name as role_name, r.code as role_code,
                l.name as lab_name, b.name as branch_name
         FROM users u
         JOIN roles r ON u.role_id = r.id
         LEFT JOIN laboratories l ON u.lab_id = l.id
         LEFT JOIN branches b ON u.branch_id = b.id
         WHERE u.lab_id = $1
         ORDER BY u.created_at DESC`,
        [labId]
      );
    }

    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users - create new staff user
router.post('/', authenticateToken, requirePermission('manage_users'), async (req: AuthRequest, res: Response) => {
  const { name, email, password, phone, role_id, branch_id } = req.body;
  const labId = req.body.lab_id || req.user?.lab_id;

  if (!name || !email || !password || !role_id) {
    res.status(400).json({ error: 'Name, email, password, and role are required' });
    return;
  }

  try {
    const existing = await db.queryOne(`SELECT id FROM users WHERE LOWER(email) = LOWER($1)`, [email.trim()]);
    if (existing) {
      res.status(409).json({ error: 'User with this email already exists' });
      return;
    }

    const userId = `user-${uuidv4().substring(0, 8)}`;
    const passwordHash = bcrypt.hashSync(password, 10);

    await db.execute(
      `INSERT INTO users (id, lab_id, branch_id, name, email, password_hash, phone, role_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')`,
      [userId, labId, branch_id || null, name, email.trim(), passwordHash, phone || '', role_id]
    );

    if (branch_id) {
      await db.execute(
        `INSERT INTO user_branches (user_id, branch_id, is_primary) VALUES ($1, $2, 1)`,
        [userId, branch_id]
      );
    }

    auditFromReq(req, 'CREATE_USER', 'user', userId, null, { name, email, role_id });
    res.status(201).json({ message: 'User created successfully', id: userId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id/status
router.put('/:id/status', authenticateToken, requirePermission('manage_users'), async (req: AuthRequest, res: Response) => {
  const userId = req.params.id as string;
  const { status } = req.body; // active, inactive, suspended

  try {
    await db.execute(`UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [status, userId]);
    auditFromReq(req, 'UPDATE_USER_STATUS', 'user', userId, null, { status });
    res.json({ message: `User status changed to ${status}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
