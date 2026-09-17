/**
 * SaaS Subscription & Entitlements Engine
 * Evaluates tenant plan features dynamically.
 */

import { SubscriptionEntitlements } from '../../types';

export const DEFAULT_ENTITLEMENTS: SubscriptionEntitlements = {
  tier: 'enterprise',
  status: 'active',
  features: {
    extension_enabled: true,
    sidepanel_enabled: true,
    advanced_search: true,
    realtime_sync: true,
    ai_predictions: true,
    barcode_scanning: true,
    export_data: true
  }
};

class EntitlementService {
  private currentEntitlements: SubscriptionEntitlements = DEFAULT_ENTITLEMENTS;

  public setEntitlements(entitlements: Partial<SubscriptionEntitlements>): void {
    this.currentEntitlements = {
      ...this.currentEntitlements,
      ...entitlements,
      features: {
        ...this.currentEntitlements.features,
        ...(entitlements.features || {})
      }
    };
  }

  public getEntitlements(): SubscriptionEntitlements {
    return this.currentEntitlements;
  }

  public isFeatureEntitled(featureKey: keyof SubscriptionEntitlements['features']): boolean {
    return Boolean(this.currentEntitlements.features[featureKey]);
  }

  public getTier(): string {
    return this.currentEntitlements.tier;
  }
}

export const entitlementService = new EntitlementService();
export default entitlementService;
