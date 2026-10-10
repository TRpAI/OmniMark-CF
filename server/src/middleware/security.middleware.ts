import { Request, Response, NextFunction } from 'express';

/**
 * Extract genuine client IP respecting Cloudflare and reverse proxies
 */
export function getClientIp(req: Request): string {
  const cfConnectingIp = req.headers['cf-connecting-ip'];
  if (typeof cfConnectingIp === 'string' && cfConnectingIp.trim()) {
    return cfConnectingIp.trim();
  }
  const trueClientIp = req.headers['true-client-ip'];
  if (typeof trueClientIp === 'string' && trueClientIp.trim()) {
    return trueClientIp.trim();
  }
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (typeof xForwardedFor === 'string' && xForwardedFor.trim()) {
    return xForwardedFor.split(',')[0].trim();
  }
  return req.socket.remoteAddress || req.ip || '127.0.0.1';
}

/**
 * Enterprise Security & Cloudflare edge optimization headers
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Strip server fingerprints
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');

  // Baseline HTTP security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), browsing-topics=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('X-DNS-Prefetch-Control', 'off');

  // HSTS for secure HTTPS connections (essential for Cloudflare SSL/TLS)
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Ensure dynamic APIs are not inappropriately cached by intermediate Cloudflare edge caches
  if (req.path.startsWith('/api/') || req.path.startsWith('/health')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
  }

  next();
}
