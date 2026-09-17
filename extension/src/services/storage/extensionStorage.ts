/**
 * Extension Storage Architecture
 * Implements isolated storage partitions for Settings, Secure Session, and Cached Data.
 * Works with chrome.storage.local in extensions, with localStorage fallback for testing/dev.
 */

import { LocalSettings, SessionData } from '../../types';

export const DEFAULT_SETTINGS: LocalSettings = {
  theme: 'system',
  language: 'en',
  apiBaseUrl: 'http://localhost:5000/api',
  enableNotifications: true,
  enableSound: true,
  enablePanicAlerts: true,
  enableQuickAccession: true,
  compactMode: false,
  environment: 'development',
  telemetryEnabled: true
};

interface CacheEnvelope<T> {
  data: T;
  expiresAt: number; // ms
  version: string;
}

class ExtensionStorage {
  private memoryFallback: Map<string, string> = new Map();

  private hasChromeStorage(): boolean {
    return typeof chrome !== 'undefined' && Boolean(chrome?.storage?.local);
  }

  private hasLocalStorage(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  // --- GENERIC GET / SET / REMOVE ---
  public async get<T>(key: string): Promise<T | null> {
    if (this.hasChromeStorage()) {
      return new Promise<T | null>((resolve) => {
        chrome.storage.local.get([key], (result) => {
          if (chrome.runtime?.lastError) {
            console.error('[Storage Get Error]', chrome.runtime.lastError);
            resolve(null);
          } else {
            resolve((result[key] as T) ?? null);
          }
        });
      });
    }

    if (this.hasLocalStorage()) {
      try {
        const raw = localStorage.getItem(`mediflow_${key}`);
        return raw ? (JSON.parse(raw) as T) : null;
      } catch {
        return null;
      }
    }

    const mem = this.memoryFallback.get(`mediflow_${key}`);
    return mem ? (JSON.parse(mem) as T) : null;
  }

  public async set<T>(key: string, value: T): Promise<void> {
    if (this.hasChromeStorage()) {
      return new Promise<void>((resolve) => {
        chrome.storage.local.set({ [key]: value }, () => {
          if (chrome.runtime?.lastError) {
            console.error('[Storage Set Error]', chrome.runtime.lastError);
          }
          resolve();
        });
      });
    }

    const serialized = JSON.stringify(value);
    if (this.hasLocalStorage()) {
      try {
        localStorage.setItem(`mediflow_${key}`, serialized);
        return;
      } catch (e) {
        console.error('[LocalStorage Set Error]', e);
      }
    }

    this.memoryFallback.set(`mediflow_${key}`, serialized);
  }

  public async remove(key: string): Promise<void> {
    if (this.hasChromeStorage()) {
      return new Promise<void>((resolve) => {
        chrome.storage.local.remove([key], () => resolve());
      });
    }

    if (this.hasLocalStorage()) {
      try {
        localStorage.removeItem(`mediflow_${key}`);
      } catch {}
    }
    this.memoryFallback.delete(`mediflow_${key}`);
  }

  public async clear(): Promise<void> {
    if (this.hasChromeStorage()) {
      return new Promise<void>((resolve) => {
        chrome.storage.local.clear(() => resolve());
      });
    }

    if (this.hasLocalStorage()) {
      try {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('mediflow_'));
        keys.forEach(k => localStorage.removeItem(k));
      } catch {}
    }
    this.memoryFallback.clear();
  }

  // --- LOCAL CONFIGURATION ---
  public async getSettings(): Promise<LocalSettings> {
    const saved = await this.get<Partial<LocalSettings>>('settings');
    return { ...DEFAULT_SETTINGS, ...(saved || {}) };
  }

  public async updateSettings(updates: Partial<LocalSettings>): Promise<LocalSettings> {
    const current = await this.getSettings();
    const updated = { ...current, ...updates };
    await this.set('settings', updated);
    return updated;
  }

  // --- SECURE SESSION DATA ---
  public async getSession(): Promise<SessionData | null> {
    const session = await this.get<SessionData>('session');
    if (!session) return null;

    // Check if session has expired
    if (Date.now() > session.expiresAt) {
      await this.clearSession();
      return null;
    }
    return session;
  }

  public async setSession(session: SessionData): Promise<void> {
    await this.set('session', session);
  }

  public async clearSession(): Promise<void> {
    await this.remove('session');
  }

  // --- APPLICATION CACHING WITH TTL ---
  public async getCached<T>(cacheKey: string): Promise<T | null> {
    const key = `cache_${cacheKey}`;
    const envelope = await this.get<CacheEnvelope<T>>(key);
    if (!envelope) return null;

    if (Date.now() > envelope.expiresAt) {
      await this.remove(key);
      return null;
    }
    return envelope.data;
  }

  public async setCached<T>(cacheKey: string, data: T, ttlMs: number = 5 * 60 * 1000): Promise<void> {
    const key = `cache_${cacheKey}`;
    const envelope: CacheEnvelope<T> = {
      data,
      expiresAt: Date.now() + ttlMs,
      version: '1.0.0'
    };
    await this.set(key, envelope);
  }

  public async invalidateCache(prefix?: string): Promise<void> {
    if (this.hasChromeStorage()) {
      chrome.storage.local.get(null, (items) => {
        const keysToRemove = Object.keys(items).filter(k => 
          k.startsWith('cache_') && (!prefix || k.startsWith(`cache_${prefix}`))
        );
        if (keysToRemove.length > 0) {
          chrome.storage.local.remove(keysToRemove);
        }
      });
      return;
    }

    try {
      const keys = Object.keys(localStorage).filter(k => 
        k.startsWith('mediflow_cache_') && (!prefix || k.startsWith(`mediflow_cache_${prefix}`))
      );
      keys.forEach(k => localStorage.removeItem(k));
    } catch {}
  }
}

export const extensionStorage = new ExtensionStorage();
export default extensionStorage;
