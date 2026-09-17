import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import Logger from './logger';
import { NotificationService } from './notificationService';

export type SubscriptionState =
  | 'trial'
  | 'active'
  | 'past_due'
  | 'grace_period'
  | 'suspended'
  | 'cancelled'
  | 'expired';

export class SubscriptionBillingService {
  /**
   * Evaluate all tenant subscriptions and enforce lifecycle states & grace periods.
   */
  static async evaluateAllSubscriptions(): Promise<{
    evaluated_count: number;
    active_count: number;
    grace_period_count: number;
    suspended_count: number;
    actions_taken: string[];
  }> {
    const labs = await db.query<{
      id: string;
      name: string;
      status: string;
      subscription_start: string;
      subscription_end: string;
      plan_name: string;
      plan_price: number;
    }>(
      `SELECT l.id, l.name, l.status, l.subscription_start, l.subscription_end,
              p.name as plan_name, p.price as plan_price
       FROM laboratories l
       LEFT JOIN subscription_plans p ON l.subscription_plan_id = p.id`
    );

    const now = new Date();
    const actions: string[] = [];
    let activeCount = 0;
    let graceCount = 0;
    let suspendedCount = 0;

    for (const lab of labs) {
      if (!lab.subscription_end) continue;

      const expiry = new Date(lab.subscription_end);
      const diffMs = expiry.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      // 1. Expiring Soon Alert (within 3 days)
      if (diffDays <= 3 && diffDays > 0 && lab.status === 'active') {
        actions.push(`Lab ${lab.name}: Subscription expires in ${diffDays} days. Payment reminder dispatched.`);
        await NotificationService.sendInApp(
          lab.id,
          null,
          'Subscription Expiration Notice',
          `Your ${lab.plan_name} subscription will expire in ${diffDays} days. Please renew to ensure uninterrupted laboratory services.`,
          'warning',
          '/subscriptions'
        );
      }

      // 2. Past Due / Grace Period (Expired within last 7 days)
      else if (diffDays <= 0 && diffDays >= -7 && lab.status === 'active') {
        graceCount++;
        actions.push(`Lab ${lab.name}: Subscription in 7-day Grace Period (${Math.abs(diffDays)} days overdue).`);
        await NotificationService.sendInApp(
          lab.id,
          null,
          'Urgent: Subscription in Grace Period',
          `Payment for your subscription is past due. Your facility is currently operating under a 7-day grace period. Immediate renewal required.`,
          'danger',
          '/subscriptions'
        );
      }

      // 3. Grace Period Exceeded (> 7 days overdue) -> Automatic Suspension
      else if (diffDays < -7 && lab.status !== 'suspended') {
        suspendedCount++;
        await db.execute(`UPDATE laboratories SET status = 'suspended' WHERE id = $1`, [lab.id]);
        actions.push(`Lab ${lab.name}: Grace period exceeded. Laboratory status transitioned to SUSPENDED.`);
        await NotificationService.sendInApp(
          lab.id,
          null,
          'Facility Operations Suspended',
          `Laboratory access has been suspended due to unresolved overdue subscription invoices. Contact enterprise billing support to reactivate.`,
          'danger',
          '/subscriptions'
        );
      } else if (lab.status === 'active') {
        activeCount++;
      }
    }

    Logger.info(`Subscription lifecycle evaluation complete`, {
      evaluated_count: labs.length,
      active_count: activeCount,
      grace_count: graceCount,
      suspended_count: suspendedCount
    });

    return {
      evaluated_count: labs.length,
      active_count: activeCount,
      grace_period_count: graceCount,
      suspended_count: suspendedCount,
      actions_taken: actions
    };
  }

  /**
   * Generate official periodic subscription renewal invoice.
   */
  static async generateSubscriptionInvoice(labId: string, planId: string, couponCode?: string) {
    const plan = await db.queryOne<{ id: string; name: string; price: number; duration_days: number }>(
      `SELECT * FROM subscription_plans WHERE id = $1`,
      [planId]
    );
    if (!plan) throw new Error('Subscription plan not found');

    const subtotal = plan.price;
    let discount = 0;
    if (couponCode && couponCode.toUpperCase() === 'ENTERPRISE20') {
      discount = Math.round(subtotal * 0.2); // 20% discount
    }

    const netBeforeTax = subtotal - discount;
    const tax = Math.round(netBeforeTax * 0.18); // 18% GST
    const netTotal = netBeforeTax + tax;

    const invoiceNumber = `SUB-INV-${Date.now().toString().slice(-6)}`;
    const invoiceId = `inv-sub-${uuidv4().substring(0, 8)}`;

    return {
      invoice_id: invoiceId,
      invoice_number: invoiceNumber,
      plan_name: plan.name,
      plan_duration_days: plan.duration_days,
      subtotal,
      discount,
      tax_gst_18_percent: tax,
      net_total: netTotal,
      currency: 'INR',
      status: 'unpaid'
    };
  }
}

export default SubscriptionBillingService;
