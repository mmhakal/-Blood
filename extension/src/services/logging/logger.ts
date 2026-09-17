/**
 * Structured Extension Logger with Automatic PII & Secret Scrubbing
 */

const SENSITIVE_KEYS = ['token', 'password', 'jwt', 'secret', 'authorization', 'bearer', 'phone', 'mobile'];

function scrub(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(scrub);
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.some(k => key.toLowerCase().includes(k))) {
      clean[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      clean[key] = scrub(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

class ExtensionLogger {
  private isDev = true;

  public setDev(isDev: boolean) {
    this.isDev = isDev;
  }

  public debug(message: string, ...context: any[]) {
    if (this.isDev) {
      console.debug(`[MediFlow Extension 🔍 DEBUG] ${message}`, ...context.map(scrub));
    }
  }

  public info(message: string, ...context: any[]) {
    console.info(`[MediFlow Extension ℹ️ INFO] ${message}`, ...context.map(scrub));
  }

  public warn(message: string, ...context: any[]) {
    console.warn(`[MediFlow Extension ⚠️ WARN] ${message}`, ...context.map(scrub));
  }

  public error(message: string, err?: any, ...context: any[]) {
    console.error(`[MediFlow Extension ❌ ERROR] ${message}`, err ? scrub(err) : '', ...context.map(scrub));
  }
}

export const logger = new ExtensionLogger();
export default logger;
