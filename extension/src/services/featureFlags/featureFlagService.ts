/**
 * Remote Feature Flags Client for MediFlow Extension
 * Safely evaluates flags with resilient offline fallbacks.
 */

import { FeatureFlag } from '../../types';
import { extensionStorage } from '../storage/extensionStorage';

const DEFAULT_FLAGS: Record<string, boolean> = {
  'extension.enabled': true,
  'sidepanel.enabled': true,
  'ai.enabled': true,
  'advanced-search.enabled': true,
  'integration.enabled': true,
  'offline-sync.enabled': true,
  'barcode-accession.enabled': true,
  'beta-features.enabled': false
};

class FeatureFlagService {
  private memoryCache: Map<string, boolean> = new Map();

  constructor() {
    Object.entries(DEFAULT_FLAGS).forEach(([k, v]) => this.memoryCache.set(k, v));
  }

  public isEnabled(flagKey: string, defaultValue?: boolean): boolean {
    if (this.memoryCache.has(flagKey)) {
      return this.memoryCache.get(flagKey)!;
    }
    return defaultValue !== undefined ? defaultValue : (DEFAULT_FLAGS[flagKey] ?? false);
  }

  public updateFlagsFromRemote(remoteFlags: FeatureFlag[]): void {
    if (!Array.isArray(remoteFlags)) return;
    remoteFlags.forEach(f => {
      this.memoryCache.set(f.flag_key, Boolean(f.is_enabled));
    });
    // Persist to extension storage cache
    extensionStorage.setCached('feature_flags', Array.from(this.memoryCache.entries()), 60 * 60 * 1000);
  }

  public async restoreFromCache(): Promise<void> {
    const cached = await extensionStorage.getCached<[string, boolean][]>('feature_flags');
    if (cached && Array.isArray(cached)) {
      cached.forEach(([k, v]) => this.memoryCache.set(k, v));
    }
  }
}

export const featureFlagService = new FeatureFlagService();
export default featureFlagService;
