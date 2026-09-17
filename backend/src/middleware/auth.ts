import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../db/database';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role_id: string;
  role_code: string;
  lab_id: string | null;
  branch_id: string | null;
  permissions: string[];
  doctor_id?: string | null;
  patient_id?: string | null;
  is_doctor?: boolean;
  is_patient?: boolean;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export const JWT_SECRET = process.env.JWT_SECRET || 'super_secure_clinical_lis_jwt_secret_key_2026_x89!';

export async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Access token missing' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Handle Doctor Portal Token
    if (decoded.is_doctor && decoded.doctor_id) {
      const docAccount = await db.queryOne<{
        id: string;
        lab_id: string;
        doctor_id: string;
        email: string;
        is_active: boolean | number;
        doctor_name: string;
      }>(
        `SELECT dpa.id, dpa.lab_id, dpa.doctor_id, dpa.email, dpa.is_active, d.name as doctor_name
         FROM doctor_portal_accounts dpa
         JOIN doctors d ON dpa.doctor_id = d.id
         WHERE dpa.id = $1`,
        [decoded.id]
      );

      if (!docAccount || !docAccount.is_active) {
        res.status(401).json({ error: 'Unauthorized: User inactive or not found' });
        return;
      }

      req.user = {
        id: docAccount.id,
        email: docAccount.email || '',
        name: docAccount.doctor_name,
        role_id: 'role-doctor',
        role_code: 'doctor',
        lab_id: docAccount.lab_id,
        branch_id: null,
        permissions: ['doctor:read', 'doctor:reports'],
        doctor_id: docAccount.doctor_id,
        is_doctor: true
      };
      return next();
    }

    // Handle Patient Portal Token
    if (decoded.is_patient && decoded.patient_id) {
      const ptAccount = await db.queryOne<{
        id: string;
        lab_id: string;
        patient_id: string;
        email: string;
        is_active: boolean | number;
        patient_name: string;
      }>(
        `SELECT ppa.id, ppa.lab_id, ppa.patient_id, ppa.email, ppa.is_active, p.name as patient_name
         FROM patient_portal_accounts ppa
         JOIN patients p ON ppa.patient_id = p.id
         WHERE ppa.id = $1`,
        [decoded.id]
      );

      if (!ptAccount || !ptAccount.is_active) {
        res.status(401).json({ error: 'Unauthorized: User inactive or not found' });
        return;
      }

      req.user = {
        id: ptAccount.id,
        email: ptAccount.email || '',
        name: ptAccount.patient_name,
        role_id: 'role-patient',
        role_code: 'patient',
        lab_id: ptAccount.lab_id,
        branch_id: null,
        permissions: ['patient:read', 'patient:reports'],
        patient_id: ptAccount.patient_id,
        is_patient: true
      };
      return next();
    }

    // Standard Staff / Admin User token
    const userId = decoded.userId || decoded.id;
    const userRow = await db.queryOne<{
      id: string;
      email: string;
      name: string;
      role_id: string;
      role_code: string;
      lab_id: string | null;
      branch_id: string | null;
      status: string;
    }>(
      `SELECT u.id, u.email, u.name, u.role_id, r.code as role_code, u.lab_id, u.branch_id, u.status
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [userId]
    );

    if (!userRow || userRow.status !== 'active') {
      res.status(401).json({ error: 'Unauthorized: User inactive or not found' });
      return;
    }

    // Fetch permissions
    const permRows = await db.query<{ code: string }>(
      `SELECT p.code
       FROM role_permissions rp
       JOIN permissions p ON rp.permission_id = p.id
       WHERE rp.role_id = $1`,
      [userRow.role_id]
    );

    req.user = {
      ...userRow,
      permissions: permRows.map(p => p.code),
    };

    next();
  } catch (err: any) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
}

export function generateToken(payload: { userId: string; role: string; labId?: string | null }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
