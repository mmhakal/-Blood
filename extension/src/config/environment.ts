/**
 * Environment & Configuration Management for MediFlow LIS Extension
 * Never hardcodes production secrets.
 */

export interface EnvironmentConfig {
  environment: 'development' | 'staging' | 'production';
  apiBaseUrl: string;
  appBaseUrl: string;
  tokenRefreshIntervalMs: number;
  notificationPollIntervalMs: number;
  cacheTtlMs: number;
  maxRetries: number;
  requestTimeoutMs: number;
  version: string;
}

const DEFAULT_CONFIGS: Record<'development' | 'staging' | 'production', EnvironmentConfig> = {
  development: {
    environment: 'development',
    apiBaseUrl: 'http://localhost:5000/api',
    appBaseUrl: 'http://localhost:3000',
    tokenRefreshIntervalMs: 45 * 60 * 1000, // 45 minutes
    notificationPollIntervalMs: 2 * 60 * 1000, // 2 minutes
    cacheTtlMs: 5 * 60 * 1000, // 5 minutes
    maxRetries: 3,
    requestTimeoutMs: 15000,
    version: '1.0.0'
  },
  staging: {
    environment: 'staging',
    apiBaseUrl: 'https://staging-api.mediflowlis.com/api',
    appBaseUrl: 'https://staging.mediflowlis.com',
    tokenRefreshIntervalMs: 30 * 60 * 1000,
    notificationPollIntervalMs: 60 * 1000,
    cacheTtlMs: 10 * 60 * 1000,
    maxRetries: 3,
    requestTimeoutMs: 20000,
    version: '1.0.0'
  },
  production: {
    environment: 'production',
    apiBaseUrl: 'http://localhost:5000/api',
    appBaseUrl: 'http://localhost:3000',
    tokenRefreshIntervalMs: 30 * 60 * 1000,
    notificationPollIntervalMs: 60 * 1000,
    cacheTtlMs: 15 * 60 * 1000,
    maxRetries: 3,
    requestTimeoutMs: 15000,
    version: '1.0.0'
  }
};

class ConfigManager {
  private currentEnv: 'development' | 'staging' | 'production' = 'development';
  private customApiBaseUrl: string | null = null;

  constructor() {
    // Detect environment if defined in build
    const env = ((import.meta as any).env?.MODE as 'development' | 'staging' | 'production') || 'development';
    this.currentEnv = env in DEFAULT_CONFIGS ? env : 'development';
  }

  public getEnvironment(): 'development' | 'staging' | 'production' {
    return this.currentEnv;
  }

  public setEnvironment(env: 'development' | 'staging' | 'production') {
    this.currentEnv = env;
  }

  public setCustomApiBaseUrl(url: string | null) {
    this.customApiBaseUrl = url && url.trim() ? url.trim().replace(/\/$/, '') : null;
  }

  public getConfig(): EnvironmentConfig {
    const base = { ...DEFAULT_CONFIGS[this.currentEnv] };
    if (this.customApiBaseUrl) {
      base.apiBaseUrl = this.customApiBaseUrl;
    }
    return base;
  }
}

export const environmentConfig = new ConfigManager();
export default environmentConfig;
