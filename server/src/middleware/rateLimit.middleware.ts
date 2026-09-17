import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const clientLimits = new Map<string, RateLimitStore>();

export interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  message?: string;
}

export function rateLimiter(options: RateLimitOptions = {}) {
  const windowMs = options.windowMs ?? 60 * 1000;
  const max = options.max ?? 60;
  const message = options.message ?? '请求过于频繁，请稍后再试';

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'anonymous';
    const key = `${String(ip)}_${req.path}`;
    const now = Date.now();

    const record = clientLimits.get(key);
    if (!record || now > record.resetTime) {
      clientLimits.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    record.count++;
    if (record.count > max) {
      res.status(429).json({ success: false, error: message });
      return;
    }

    next();
  };
}
