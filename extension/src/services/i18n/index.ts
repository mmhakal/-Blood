/**
 * Internationalization (i18n) Engine for MediFlow LIS Extension
 */

import { en } from './en';
import { hi } from './hi';
import { extensionStorage } from '../storage/extensionStorage';

export type SupportedLanguage = 'en' | 'hi';
export type TranslationKey = keyof typeof en;

const dictionaries: Record<SupportedLanguage, Record<string, string>> = {
  en,
  hi
};

class I18nService {
  private currentLang: SupportedLanguage = 'en';
  private listeners: Set<(lang: SupportedLanguage) => void> = new Set();

  constructor() {
    this.init();
  }

  private async init() {
    try {
      const settings = await extensionStorage.getSettings();
      if (settings?.language && (settings.language === 'en' || settings.language === 'hi')) {
        this.currentLang = settings.language;
      }
    } catch {
      this.currentLang = 'en';
    }
  }

  public getLanguage(): SupportedLanguage {
    return this.currentLang;
  }

  public async setLanguage(lang: SupportedLanguage): Promise<void> {
    this.currentLang = lang;
    await extensionStorage.updateSettings({ language: lang });
    this.listeners.forEach(cb => cb(lang));
  }

  public t(key: TranslationKey, params?: Record<string, string | number>): string {
    let text = dictionaries[this.currentLang]?.[key] || dictionaries.en[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`{${k}}`, 'g'), String(v));
      });
    }
    return text;
  }

  public subscribe(listener: (lang: SupportedLanguage) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const i18n = new I18nService();
export const t = (key: TranslationKey, params?: Record<string, string | number>) => i18n.t(key, params);
export default i18n;
