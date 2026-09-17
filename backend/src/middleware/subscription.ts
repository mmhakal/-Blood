import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import db from '../db/database';

/**
 * Subscription Status Middleware:
 * Verifies that the tenant laboratory has an active, unexpired subscription.
 */
export function checkSubscription() {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Super Admin bypasses subscription checks
    if (req.user.role_code === 'super_admin') {
      return next();
    }

    const labId = req.user.lab_id;
    if (!labId) {
      res.status(403).json({ error: 'User is not associated with an active diagnostic laboratory.' });
      return;
    }

    try {
      const lab = await db.queryOne<{
        status: string;
        subscription_end: string | null;
        plan_name: string;
      }>(
        `SELECT l.status, l.subscription_end, sp.name as plan_name
         FROM laboratories l
         LEFT JOIN subscription_plans sp ON l.subscription_plan_id = sp.id
         WHERE l.id = $1`,
        [labId]
      );

      if (!lab) {
        res.status(404).json({ error: 'Laboratory record not found' });
        return;
      }

      if (lab.status === 'suspended') {
        res.status(403).json({
          error: 'Laboratory Suspended: Your facility account has been temporarily suspended by Super Admin.'
        });
        return;
      }

      if (lab.status === 'deactivated') {
        res.status(403).json({
          error: 'Laboratory Deactivated: This diagnostic account is deactivated.'
        });
        return;
      }

      if (lab.subscription_end) {
        const expiryDate = new Date(lab.subscription_end);
        const now = new Date();
        if (now > expiryDate) {
          res.status(403).json({
            error: `Subscription Expired: Your laboratory's subscription expired on ${expiryDate.toLocaleDateString()}. Please renew your subscription to continue operations.`
          });
          return;
        }
      }

      next();
    } catch (err: any) {
      res.status(500).json({ error: 'Error validating laboratory subscription: ' + err.message });
    }
  };
}

/**
 * Feature Gate Middleware:
 * Verifies that the tenant laboratory's active subscription plan includes the requested feature module.
 */
export function checkFeatureAccess(featureCode: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (req.user.role_code === 'super_admin') {
      return next();
    }

    const labId = req.user.lab_id;
    if (!labId) {
      res.status(403).json({ error: 'User is not associated with an active diagnostic laboratory.' });
      return;
    }

    try {
      const plan = await db.queryOne<{ features: string }>(
        `SELECT sp.features
         FROM laboratories l
         JOIN subscription_plans sp ON l.subscription_plan_id = sp.id
         WHERE l.id = $1`,
        [labId]
      );

      if (!plan || !plan.features) {
        res.status(403).json({
          error: `Subscription Tier Restricted: Access to '${featureCode}' requires an upgraded subscription plan.`
        });
        return;
      }

      let featuresList: string[] = [];
      try {
        featuresList = JSON.parse(plan.features);
      } catch (e) {
        featuresList = [];
      }

      if (!featuresList.includes(featureCode)) {
        res.status(403).json({
          error: `Feature Not Enabled: Your subscription plan does not include the '${featureCode}' module. Contact Super Admin to upgrade.`
        });
        return;
      }

      next();
    } catch (err: any) {
      res.status(500).json({ error: 'Error validating feature access: ' + err.message });
    }
  };
}
