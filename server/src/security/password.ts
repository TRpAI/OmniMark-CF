import crypto from 'crypto';

const ITERATIONS = 100000; // Cloudflare Workers 与 OWASP PBKDF2 推荐强迭代次数 (workerd 上限 100,000)
const KEYLEN = 64;
const DIGEST = 'sha512';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    if (!storedHash || !storedHash.includes(':')) {
      return false;
    }
    const [salt, originalHash] = storedHash.split(':');
    if (!salt || !originalHash) {
      return false;
    }

    // 1. 优先校验 100,000 次标准迭代
    const hash = crypto.pbkdf2Sync(password, salt, 100000, KEYLEN, DIGEST).toString('hex');
    if (crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'))) {
      return true;
    }

    // 2. 兼容历史 210,000 次迭代
    const hash210k = crypto.pbkdf2Sync(password, salt, 210000, KEYLEN, DIGEST).toString('hex');
    if (crypto.timingSafeEqual(Buffer.from(hash210k, 'hex'), Buffer.from(originalHash, 'hex'))) {
      return true;
    }

    // 3. 兼容旧版 10,000 次迭代
    const hash10k = crypto.pbkdf2Sync(password, salt, 10000, KEYLEN, DIGEST).toString('hex');
    if (crypto.timingSafeEqual(Buffer.from(hash10k, 'hex'), Buffer.from(originalHash, 'hex'))) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

