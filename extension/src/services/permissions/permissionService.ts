/**
 * Permission System & RBAC Evaluation for MediFlow Extension
 * Evaluates fine-grained permissions against current user session.
 */

import { UserProfile, UserRole } from '../../types';

export const PERMISSION_PRESETS: Record<UserRole, string[]> = {
  super_admin: ['*'],
  lab_admin: [
    'patient.read', 'patient.create', 'patient.update',
    'order.read', 'order.create',
    'sample.read', 'sample.collect',
    'result.read', 'result.enter', 'result.verify',
    'report.read', 'report.download',
    'billing.read', 'notification.read', 'settings.manage'
  ],
  pathologist: [
    'patient.read',
    'order.read',
    'sample.read',
    'result.read', 'result.enter', 'result.verify',
    'report.read', 'report.download',
    'notification.read'
  ],
  technician: [
    'patient.read',
    'order.read',
    'sample.read', 'sample.collect',
    'result.read', 'result.enter',
    'report.read',
    'notification.read'
  ],
  phlebotomist: [
    'patient.read',
    'order.read',
    'sample.read', 'sample.collect',
    'notification.read'
  ],
  receptionist: [
    'patient.read', 'patient.create', 'patient.update',
    'order.read', 'order.create',
    'billing.read',
    'report.read', 'report.download',
    'notification.read'
  ],
  billing_clerk: [
    'patient.read',
    'order.read',
    'billing.read',
    'notification.read'
  ],
  doctor: [
    'patient.read',
    'order.read',
    'report.read', 'report.download'
  ],
  patient: [
    'patient.read',
    'report.read', 'report.download'
  ]
};

class PermissionService {
  public hasPermission(user: UserProfile | null | undefined, permission: string): boolean {
    if (!user) return false;
    if (user.role_code === 'super_admin') return true;

    // Direct permission list
    const userPerms = user.permissions || [];
    if (userPerms.includes('*') || userPerms.includes(permission)) return true;

    // Check mapped codes (e.g. backend permissions might be "patient:read" or "patient.read")
    const normalizedPerm = permission.replace('.', ':');
    if (userPerms.includes(normalizedPerm)) return true;

    // Check role preset fallback
    const preset = PERMISSION_PRESETS[user.role_code] || [];
    return preset.includes('*') || preset.includes(permission);
  }

  public hasAnyPermission(user: UserProfile | null | undefined, permissions: string[]): boolean {
    return permissions.some(p => this.hasPermission(user, p));
  }

  public hasAllPermissions(user: UserProfile | null | undefined, permissions: string[]): boolean {
    return permissions.every(p => this.hasPermission(user, p));
  }
}

export const permissionService = new PermissionService();
export default permissionService;
