/**
 * PlatformCoreRepository — Database repository for Platform Core domain
 */

import { BaseRepository } from './BaseRepository';

export class PlatformCoreRepository extends BaseRepository {
  public readonly moduleName = 'PLATFORM_CORE';
  public readonly tablesOwned = [
    'users',
    'refresh_tokens',
    'login_attempts',
    'roles',
    'permissions',
    'role_permissions',
    'user_roles',
    'laboratories',
    'branches',
    'user_branches',
    'system_settings',
    'feature_flags'
  ];

  async findUserById(userId: string) {
    return this.queryOne(`SELECT * FROM users WHERE id = $1`, [userId]);
  }

  async findUserByEmail(email: string) {
    return this.queryOne(`SELECT * FROM users WHERE LOWER(email) = LOWER($1)`, [email]);
  }

  async findLaboratoryById(labId: string) {
    return this.queryOne(`SELECT * FROM laboratories WHERE id = $1`, [labId]);
  }

  async findBranchById(branchId: string, labId: string) {
    return this.queryOne(`SELECT * FROM branches WHERE id = $1 AND lab_id = $2`, [branchId, labId]);
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const rows = await this.query<{ code: string }>(
      `SELECT p.code
       FROM users u
       JOIN role_permissions rp ON u.role_id = rp.role_id
       JOIN permissions p ON rp.permission_id = p.id
       WHERE u.id = $1`,
      [userId]
    );
    return rows.map(r => r.code);
  }
}

export default new PlatformCoreRepository();
