import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { AuthRequest } from '../middleware/auth';

export interface AuditLogParams {
  lab_id?: string | null;
  branch_id?: string | null;
  user_id?: string | null;
  user_email?: string | null;
  user_role?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  user_agent?: string;
}

export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    const id = `aud-${uuidv4().substring(0, 8)}`;
    await db.execute(
      `INSERT INTO audit_logs (id, lab_id, branch_id, user_id, user_email, user_role, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)`,
      [
        id,
        params.lab_id || null,
        params.branch_id || null,
        params.user_id || null,
        params.user_email || null,
        params.user_role || null,
        params.action,
        params.entity_type,
        params.entity_id || null,
        params.old_values ? JSON.stringify(params.old_values) : null,
        params.new_values ? JSON.stringify(params.new_values) : null,
        params.ip_address || '127.0.0.1',
        params.user_agent || 'LIS-Client'
      ]
    );
  } catch (err: any) {
    console.error('Audit log write failure:', err.message);
  }
}

export function auditFromReq(req: AuthRequest, action: string, entity_type: string, entity_id?: any, old_values?: any, new_values?: any): void {
  try {
    const headers = req?.headers || {};
    const socket = req?.socket;
    const ip = (headers['x-forwarded-for'] as string) || socket?.remoteAddress || '127.0.0.1';
    const userAgent = (headers['user-agent'] as string) || '';
    const safeEntityId = Array.isArray(entity_id) ? entity_id[0] : (entity_id ? String(entity_id) : null);

    logAudit({
      lab_id: req?.user?.lab_id,
      branch_id: req?.user?.branch_id,
      user_id: req?.user?.id,
      user_email: req?.user?.email,
      user_role: req?.user?.role_code,
      action,
      entity_type,
      entity_id: safeEntityId,
      old_values,
      new_values,
      ip_address: ip,
      user_agent: userAgent
    });
  } catch (err: any) {
    console.error('Audit log error in auditFromReq:', err.message);
  }
}
