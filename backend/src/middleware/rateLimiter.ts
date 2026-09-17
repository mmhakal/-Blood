import { Request, Response, NextFunction } from 'express';
import config from '../config';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export class MemoryRateLimiter {
  private store = new Map<string, RateLimitRecord>();
  private windowMs: number;
  private maxRequests: number;
  private message: string;

  constructor(windowMs: number, maxRequests: number, message = 'Too many requests from this IP, please try again later.') {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.message = message;

    // Periodic cleanup every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.store.entries()) {
        if (record.resetTime <= now) {
          this.store.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // In test mode with mock IP, allow normal requests unless specifically testing rate limit
      const ip = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress || 'unknown-ip';
      const key = `${ip}:${req.baseUrl || req.path}`;
      const now = Date.now();

      let record = this.store.get(key);
      if (!record || record.resetTime <= now) {
        record = {
          count: 1,
          resetTime: now + this.windowMs
        };
        this.store.set(key, record);
      } else {
        record.count++;
      }

      const remaining = Math.max(0, this.maxRequests - record.count);
      const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

      res.setHeader('X-RateLimit-Limit', this.maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', resetSeconds);

      if (record.count > this.maxRequests) {
        res.setHeader('Retry-After', resetSeconds);
        res.status(429).json({
          error: this.message,
          retry_after_seconds: resetSeconds
        });
        return;
      }

      next();
    };
  }

  reset(keyPrefix?: string) {
    if (!keyPrefix) {
      this.store.clear();
      return;
    }
    for (const key of this.store.keys()) {
      if (key.startsWith(keyPrefix)) {
        this.store.delete(key);
      }
    }
  }
}

// Global API limiter
export const globalRateLimiter = new MemoryRateLimiter(
  config.RATE_LIMIT_WINDOW_MS,
  config.RATE_LIMIT_MAX_REQUESTS,
  'Too many API requests, rate limit exceeded.'
).middleware();

// Strict Auth & Login limiter
export const authRateLimiter = new MemoryRateLimiter(
  15 * 60 * 1000,
  config.AUTH_RATE_LIMIT_MAX,
  'Consecutive authentication attempts exceeded. Account access temporarily paused for 15 minutes.'
).middleware();

export default { globalRateLimiter, authRateLimiter, MemoryRateLimiter };
