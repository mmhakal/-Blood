import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export function requireRole(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (req.user.role_code === 'super_admin' || allowedRoles.includes(req.user.role_code)) {
      return next();
    }

    res.status(403).json({
      error: `Access Denied: Role '${req.user.role_code}' does not have sufficient clearance for this operation.`
    });
  };
}

export const requireRoles = (roles: string[]) => requireRole(...roles);

export function requirePermission(permissionCode: string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Super Admin has all permissions
    if (req.user.role_code === 'super_admin') {
      return next();
    }

    if (req.user.permissions && req.user.permissions.includes(permissionCode)) {
      return next();
    }

    res.status(403).json({
      error: `Permission Denied: Missing required permission '${permissionCode}'.`
    });
  };
}
