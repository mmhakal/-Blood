import config from '../config';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const SENSITIVE_KEYS = [
  'password', 'pass', 'token', 'secret', 'authorization', 'cookie',
  'api_key', 'apikey', 'credit_card', 'card_number', 'cvv', 'signature'
];

function maskSensitive(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(maskSensitive);

  const masked: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    const isSensitive = SENSITIVE_KEYS.some(sk => k.toLowerCase().includes(sk));
    if (isSensitive && typeof v === 'string') {
      masked[k] = '***REDACTED***';
    } else if (typeof v === 'object' && v !== null) {
      masked[k] = maskSensitive(v);
    } else {
      masked[k] = v;
    }
  }
  return masked;
}

export class Logger {
  private static levelWeights: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };

  private static shouldLog(level: LogLevel): boolean {
    const currentConfigLevel = config.LOG_LEVEL as LogLevel;
    return this.levelWeights[level] >= this.levelWeights[currentConfigLevel];
  }

  private static log(level: LogLevel, message: string, meta?: Record<string, any>) {
    if (!this.shouldLog(level)) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      ...(meta ? maskSensitive(meta) : {})
    };

    const str = JSON.stringify(logEntry);
    if (level === 'error') {
      console.error(str);
    } else if (level === 'warn') {
      console.warn(str);
    } else {
      console.log(str);
    }
  }

  static debug(message: string, meta?: Record<string, any>) {
    this.log('debug', message, meta);
  }

  static info(message: string, meta?: Record<string, any>) {
    this.log('info', message, meta);
  }

  static warn(message: string, meta?: Record<string, any>) {
    this.log('warn', message, meta);
  }

  static error(message: string, error?: any, meta?: Record<string, any>) {
    const errorDetails = error instanceof Error
      ? { error_name: error.name, error_message: error.message, stack: error.stack }
      : { error_raw: error };

    this.log('error', message, { ...errorDetails, ...meta });
  }
}

export default Logger;
