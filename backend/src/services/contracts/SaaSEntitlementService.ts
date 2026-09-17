/**
 * SaaSEntitlementService — Centralized Multi-Tenant Subscriptions & Entitlements (Section 23)
 * 
 * Enforces:
 * - Centralized quota and entitlement checking
 * - No duplicated subscription logic across individual modules
 */

import db from '../../db/database';
import { IEntitlementService } from '../../types/serviceContracts';

export class SaaSEntitlementService implements IEntitlementService {
  async getLabEntitlements(labId: string): Promise<Record<string, any>> {
    const lab = await db.queryOne<{
      status: string;
      subscription_plan_id: string;
      plan_name?: string;
      max_branches?: number;
      max_users?: number;
      max_patients_per_month?: number;
      max_reports_per_month?: number;
      features?: string;
    }>(
      `SELECT l.status, l.subscription_plan_id, p.name as plan_name, p.max_branches, p.max_users, p.max_patients_per_month, p.max_reports_per_month, p.features
       FROM laboratories l
       LEFT JOIN subscription_plans p ON l.subscription_plan_id = p.id
       WHERE l.id = $1`,
      [labId]
    );

    if (!lab) {
      return { active: false, plan: 'none', features: [] };
    }

    let features: string[] = [];
    try {
      features = lab.features ? JSON.parse(lab.features) : [];
    } catch {
      features = [];
    }

    return {
      active: lab.status === 'active',
      status: lab.status,
      plan_id: lab.subscription_plan_id,
      plan_name: lab.plan_name || 'Standard',
      limits: {
        max_branches: lab.max_branches || 1,
        max_users: lab.max_users || 5,
        max_patients_per_month: lab.max_patients_per_month || 500,
        max_reports_per_month: lab.max_reports_per_month || 500
      },
      features
    };
  }

  async canAddBranch(labId: string): Promise<{ allowed: boolean; current: number; max: number }> {
    const ent = await this.getLabEntitlements(labId);
    const countRow = await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM branches WHERE lab_id = $1`, [labId]);
    const current = parseInt(countRow?.count as any || '0');
    const max = ent.limits?.max_branches || 1;

    return {
      allowed: current < max,
      current,
      max
    };
  }

  async canAddUser(labId: string): Promise<{ allowed: boolean; current: number; max: number }> {
    const ent = await this.getLabEntitlements(labId);
    const countRow = await db.queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM users WHERE lab_id = $1`, [labId]);
    const current = parseInt(countRow?.count as any || '0');
    const max = ent.limits?.max_users || 5;

    return {
      allowed: current < max,
      current,
      max
    };
  }

  async canCreateOrder(labId: string): Promise<{ allowed: boolean; current_this_month: number; max_per_month: number }> {
    const ent = await this.getLabEntitlements(labId);
    const countRow = await db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM test_orders WHERE lab_id = $1 AND created_at >= date('now', 'start of month')`,
      [labId]
    );
    const current = parseInt(countRow?.count as any || '0');
    const max = ent.limits?.max_reports_per_month || 500;

    return {
      allowed: current < max,
      current_this_month: current,
      max_per_month: max
    };
  }

  async isFeatureEnabled(labId: string, featureCode: string): Promise<boolean> {
    const ent = await this.getLabEntitlements(labId);
    return ent.features?.includes(featureCode) || ent.plan_name?.toLowerCase().includes('enterprise');
  }
}

export const saasEntitlementService = new SaaSEntitlementService();
export default saasEntitlementService;
