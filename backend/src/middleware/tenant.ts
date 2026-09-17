import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import db from '../db/database';

export interface TenantOptions {
  checkBranch?: boolean;
}

/**
 * Enforce strict Multi-Tenant Isolation:
 * - Super Admin can access all or filter by simulation header x-lab-id.
 * - Non-Superadmin can NEVER access data of any laboratory other than their own assigned lab_id.
 * - Query, params, or body lab_id tampering is strictly blocked with 403 Forbidden.
 */
async function runTenantCheck(req: AuthRequest, res: Response, next: NextFunction, options: TenantOptions = {}): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // Super Admin has global access unless simulating a tenant
  if (req.user.role_code === 'super_admin') {
    const simulatedLabId = req.headers['x-lab-id'] as string;
    if (simulatedLabId) {
      req.user.lab_id = simulatedLabId;
    }
    return next();
  }

  const userLabId = req.user.lab_id;
  if (!userLabId) {
    res.status(403).json({ error: 'Access Denied: User is not assigned to any laboratory tenant' });
    return;
  }

  // Check if target lab_id was specified in params, query, or body
  const targetLabId = (req.params.lab_id || req.params.labId || req.query.lab_id || req.query.labId || req.body?.lab_id || req.body?.labId) as string;

  if (targetLabId && targetLabId !== userLabId) {
    res.status(403).json({
      error: 'Tenant Security Violation: Cross-tenant access to another laboratory is strictly prohibited.'
    });
    return;
  }

  // Optional branch-level isolation check
  if (options.checkBranch) {
    const targetBranchId = (req.params.branch_id || req.params.branchId || req.query.branch_id || req.query.branchId || req.body?.branch_id || req.body?.branchId) as string;
    
    if (targetBranchId && targetBranchId !== req.user.branch_id) {
      // Check if user is mapped to this branch via user_branches
      const hasBranchAccess = await db.queryOne(
        `SELECT 1 FROM user_branches WHERE user_id = $1 AND branch_id = $2`,
        [req.user.id, targetBranchId]
      );

      if (!hasBranchAccess && req.user.role_code !== 'lab_admin') {
        res.status(403).json({
          error: 'Branch Security Violation: You do not have clearance to access this branch location.'
        });
        return;
      }
    }
  }

  next();
}

export function requireTenantAccess(optionsOrReq?: any, maybeRes?: any, maybeNext?: any): any {
  // If invoked directly as middleware: requireTenantAccess(req, res, next)
  if (optionsOrReq && (optionsOrReq as any).headers && maybeRes && maybeNext) {
    return runTenantCheck(optionsOrReq, maybeRes, maybeNext, {});
  }

  // Otherwise invoked as a factory: requireTenantAccess(options)
  const options = (optionsOrReq as TenantOptions) || {};
  return (req: AuthRequest, res: Response, next: NextFunction) => runTenantCheck(req, res, next, options);
}

export const requireTenant = requireTenantAccess;
export default requireTenantAccess;

// Backward-compatible alias
export const enforceTenantIsolation = requireTenantAccess();

