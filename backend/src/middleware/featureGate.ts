import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import db from '../db/database';

export function checkFeature(featureKey: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    // Super admins bypass all feature gates
    if (req.user?.role_code === 'super_admin') {
      return next();
    }

    const labId = req.user?.lab_id;
    if (!labId) {
      res.status(403).json({ error: 'Laboratory context required to access this feature' });
      return;
    }

    try {
      // Find active subscription plan for this laboratory
      const sub = await db.queryOne<{ plan_id: string; plan_code: string; features: string }>(
        `SELECT s.plan_id, p.code as plan_code, p.features
         FROM subscriptions s
         JOIN subscription_plans p ON s.plan_id = p.id
         WHERE s.lab_id = $1 AND s.status = 'active'
         ORDER BY s.end_date DESC LIMIT 1`,
        [labId]
      );

      // Default plans allow basic features; if no subscription, allow core
      if (!sub) {
        return next();
      }

      // Check plan features JSON if defined
      if (sub.features) {
        try {
          const parsed = JSON.parse(sub.features);
          if (Array.isArray(parsed) && !parsed.includes(featureKey)) {
            // Also check if explicitly disabled in subscription_features table
            const explicit = await db.queryOne<{ is_enabled: boolean }>(
              `SELECT is_enabled FROM subscription_features WHERE plan_id = $1 AND feature_key = $2`,
              [sub.plan_id, featureKey]
            );

            if (explicit && !explicit.is_enabled) {
              res.status(403).json({
                error: `The feature "${featureKey}" is not enabled for your subscription plan (${sub.plan_code}). Please upgrade to access this module.`,
                feature_key: featureKey,
                plan_code: sub.plan_code
              });
              return;
            }
          }
        } catch {
          // ignore parse error
        }
      }

      // Track feature usage count
      await db.execute(
        `INSERT INTO feature_usage (id, lab_id, feature_key, usage_count, reset_date, updated_at)
         VALUES ($1, $2, $3, 1, CURRENT_DATE, CURRENT_TIMESTAMP)
         ON CONFLICT (lab_id, feature_key)
         DO UPDATE SET usage_count = feature_usage.usage_count + 1, updated_at = CURRENT_TIMESTAMP`,
        [`fu-${labId}-${featureKey}`, labId, featureKey]
      );

      next();
    } catch (err: any) {
      // Allow progression on unexpected check failure to prevent clinical outage
      console.warn(`Feature gate check warning for ${featureKey}:`, err.message);
      next();
    }
  };
}
