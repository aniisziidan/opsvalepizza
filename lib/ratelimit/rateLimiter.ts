import { NextResponse } from 'next/server';
import { RateLimitConfig, RateLimitResult, RateLimitEntry } from './types';

// In-memory sliding window cache
const rateLimitStore = new Map<string, RateLimitEntry>();

// Predefined tier configurations
export const RATE_LIMIT_TIERS: Record<string, RateLimitConfig> = {
  CALCULATOR: { maxRequests: 30, windowSeconds: 60 },
  FILE_UPLOAD: { maxRequests: 10, windowSeconds: 60 },
  QUOTE_REQUEST: { maxRequests: 5, windowSeconds: 600 },
  ADMIN_LOGIN: { maxRequests: 5, windowSeconds: 900 },
  ADMIN_SEARCH: { maxRequests: 60, windowSeconds: 60 },
};

/**
 * Extracts the client IP safely from request headers.
 *
 * Forwarded headers are only honored when `TRUST_PROXY=true` — i.e. when the app genuinely sits
 * behind a reverse proxy. Without that flag they are ignored so a client cannot spoof its identity
 * to evade rate limiting.
 *
 * Header precedence matters for correctness: the left-most `X-Forwarded-For` entry is set by the
 * *client* (nginx appends via `$proxy_add_x_forwarded_for`) and is therefore attacker-spoofable,
 * which would let an attacker mint an unlimited number of rate-limit buckets. We instead prefer
 * headers written by the trusted edge/proxy itself:
 *   1. `cf-connecting-ip`  — set by Cloudflare, overwrites any client-supplied value.
 *   2. `x-real-ip`         — set by nginx to the real peer address.
 *   3. `x-forwarded-for`   — last resort; we take the *right-most* entry, which is the hop the
 *                            trusted proxy observed, not the client-controlled left-most value.
 * Falls back to '127.0.0.1'.
 */
export function getClientIp(req: Request | Headers | undefined | null): string {
  const headers = req instanceof Request ? req.headers : req;
  // Defensive: some callers (e.g. an auth callback without a request context)
  // may pass nothing. Never throw from IP resolution.
  if (!headers || typeof headers.get !== 'function') {
    return '127.0.0.1';
  }
  const trustProxy = process.env.TRUST_PROXY === 'true';

  if (trustProxy) {
    const cfIp = headers.get('cf-connecting-ip');
    if (cfIp && cfIp.trim()) return cfIp.trim();

    const realIp = headers.get('x-real-ip');
    if (realIp && realIp.trim()) return realIp.trim();

    const forwarded = headers.get('x-forwarded-for');
    if (forwarded) {
      const parts = forwarded.split(',').map((p) => p.trim()).filter(Boolean);
      const rightMost = parts[parts.length - 1];
      if (rightMost) return rightMost;
    }
  }

  return '127.0.0.1';
}

/**
 * Synchronous in-memory sliding-window algorithm.
 * Clears timestamps older than the window windowSeconds.
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const windowStart = now - windowMs;

  let entry = rateLimitStore.get(identifier);
  if (!entry) {
    entry = {
      tokens: config.maxRequests,
      lastRefillTime: now,
      requestTimestamps: [],
    };
    rateLimitStore.set(identifier, entry);
  }

  // Filter out timestamps outside the sliding window
  entry.requestTimestamps = entry.requestTimestamps.filter((ts) => ts > windowStart);

  if (entry.requestTimestamps.length >= config.maxRequests) {
    const oldestTimestamp = entry.requestTimestamps[0] || now;
    const resetTimeMs = oldestTimestamp + windowMs;
    const retryAfterSeconds = Math.max(1, Math.ceil((resetTimeMs - now) / 1000));

    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      resetTimeMs,
      retryAfterSeconds,
    };
  }

  // Record this request
  entry.requestTimestamps.push(now);
  const remaining = config.maxRequests - entry.requestTimestamps.length;
  const resetTimeMs = now + windowMs;

  return {
    success: true,
    limit: config.maxRequests,
    remaining,
    resetTimeMs,
    retryAfterSeconds: 0,
  };
}

/**
 * Distributed rate limiting adapter supporting Upstash Redis REST or Redis protocol.
 * Falls back safely to in-memory sliding window when Redis is unconfigured or unreachable.
 */
export async function checkRateLimitAsync(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    try {
      const now = Date.now();
      const windowMs = config.windowSeconds * 1000;
      const windowStart = now - windowMs;
      const key = `ratelimit:${identifier}`;

      // Upstash REST pipeline: ZREMRANGEBYSCORE, ZADD, ZCARD, EXPIRE
      const pipelineRes = await fetch(`${upstashUrl}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['ZREMRANGEBYSCORE', key, 0, windowStart],
          ['ZADD', key, now, `${now}-${Math.random()}`],
          ['ZCARD', key],
          ['EXPIRE', key, config.windowSeconds + 60],
        ]),
      });

      if (pipelineRes.ok) {
        const results = await pipelineRes.json();
        const currentCount = typeof results[2]?.result === 'number' ? results[2].result : 1;

        if (currentCount > config.maxRequests) {
          const resetTimeMs = now + windowMs;
          const retryAfterSeconds = Math.max(1, config.windowSeconds);
          return {
            success: false,
            limit: config.maxRequests,
            remaining: 0,
            resetTimeMs,
            retryAfterSeconds,
          };
        }

        return {
          success: true,
          limit: config.maxRequests,
          remaining: Math.max(0, config.maxRequests - currentCount),
          resetTimeMs: now + windowMs,
          retryAfterSeconds: 0,
        };
      }
    } catch {
      // Fallback silently to memory
    }
  }

  return checkRateLimit(identifier, config);
}

/**
 * Resets rate limit for an identifier (useful for tests or successful authentication).
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Async reset supporting distributed stores.
 */
export async function resetRateLimitAsync(identifier: string): Promise<void> {
  rateLimitStore.delete(identifier);

  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    try {
      await fetch(`${upstashUrl}/del/ratelimit:${encodeURIComponent(identifier)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${upstashToken}` },
      });
    } catch {
      // ignore
    }
  }
}

/**
 * Helper to produce standard HTTP 429 Too Many Requests response with RFC compliant headers.
 */
export function createRateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Please retry after ${result.retryAfterSeconds} seconds.`,
      retryAfter: result.retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfterSeconds),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil(result.resetTimeMs / 1000)),
      },
    }
  );
}
