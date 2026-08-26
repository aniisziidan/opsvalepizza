/**
 * Rate Limiter interface and implementations.
 * Development uses an in-memory sliding window limiter.
 * Production will use Redis/Upstash (Phase 7).
 */

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
}

export interface RateLimiter {
  check(key: string, limit: number, windowMs: number): Promise<RateLimitResult>;
}

class MemoryRateLimiter implements RateLimiter {
  private requests: Map<string, number[]> = new Map();

  async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];

    // Filter out timestamps outside window
    const validTimestamps = timestamps.filter((t) => now - t < windowMs);

    if (validTimestamps.length >= limit) {
      const oldest = validTimestamps[0];
      const resetMs = oldest ? windowMs - (now - oldest) : windowMs;
      this.requests.set(key, validTimestamps);
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetMs: Math.max(0, resetMs),
      };
    }

    validTimestamps.push(now);
    this.requests.set(key, validTimestamps);

    return {
      allowed: true,
      limit,
      remaining: limit - validTimestamps.length,
      resetMs: windowMs,
    };
  }
}

export const rateLimiter: RateLimiter = new MemoryRateLimiter();

/**
 * Resolves client IP address, only respecting x-forwarded-for if TRUST_PROXY is true.
 */
export function getClientIp(req: Request): string {
  const trustProxy = process.env.TRUST_PROXY === 'true';

  if (trustProxy) {
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) {
      const firstIp = forwarded.split(',')[0]?.trim();
      if (firstIp) return firstIp;
    }
    const realIp = req.headers.get('x-real-ip');
    if (realIp) return realIp.trim();
  }

  // Fallback / default identifier
  return req.headers.get('host') || '127.0.0.1';
}
