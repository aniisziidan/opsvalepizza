import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { checkRateLimit, checkRateLimitAsync, resetRateLimit, createRateLimitResponse, getClientIp } from '../rateLimiter';

describe('Rate Limiter Engine', () => {
  beforeEach(() => {
    resetRateLimit('test-ip');
    resetRateLimit('test-burst');
  });

  it('permits requests within the defined threshold and calculates remaining tokens', () => {
    const config = { maxRequests: 3, windowSeconds: 10 };

    const r1 = checkRateLimit('test-ip', config);
    expect(r1.success).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = checkRateLimit('test-ip', config);
    expect(r2.success).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = checkRateLimit('test-ip', config);
    expect(r3.success).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it('rejects requests exceeding the maximum capacity with retryAfterSeconds', () => {
    const config = { maxRequests: 2, windowSeconds: 60 };

    checkRateLimit('test-burst', config);
    checkRateLimit('test-burst', config);

    const blocked = checkRateLimit('test-burst', config);
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(1);

    const response = createRateLimitResponse(blocked);
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBeDefined();
    expect(response.headers.get('X-RateLimit-Limit')).toBe('2');
  });

  describe('getClientIp proxy trust', () => {
    const original = process.env.TRUST_PROXY;

    afterEach(() => {
      if (original === undefined) delete process.env.TRUST_PROXY;
      else process.env.TRUST_PROXY = original;
    });

    it('ignores forwarded headers when TRUST_PROXY is not enabled (unspoofable)', () => {
      delete process.env.TRUST_PROXY;
      const headers = new Headers({
        'x-forwarded-for': '203.0.113.195, 70.41.3.18',
        'cf-connecting-ip': '203.0.113.195',
      });
      expect(getClientIp(headers)).toBe('127.0.0.1');
    });

    it('prefers the Cloudflare-set cf-connecting-ip over spoofable forwarded headers', () => {
      process.env.TRUST_PROXY = 'true';
      // Attacker spoofs a left-most XFF entry; the trusted edge header must win.
      const headers = new Headers({
        'x-forwarded-for': '1.2.3.4, 198.51.100.22',
        'x-real-ip': '198.51.100.22',
        'cf-connecting-ip': '203.0.113.9',
      });
      expect(getClientIp(headers)).toBe('203.0.113.9');
    });

    it('falls back to x-real-ip, then the right-most XFF hop (not the client-set left-most)', () => {
      process.env.TRUST_PROXY = 'true';

      const realIpOnly = new Headers({ 'x-real-ip': '198.51.100.22' });
      expect(getClientIp(realIpOnly)).toBe('198.51.100.22');

      // Only XFF present: an attacker controls the left-most entry, so we take
      // the right-most (the hop the trusted proxy actually observed).
      const xffOnly = new Headers({ 'x-forwarded-for': '203.0.113.195, 70.41.3.18' });
      expect(getClientIp(xffOnly)).toBe('70.41.3.18');
    });

    it('falls back to 127.0.0.1 when trusting a proxy but no forwarded headers present', () => {
      process.env.TRUST_PROXY = 'true';
      expect(getClientIp(new Headers())).toBe('127.0.0.1');
    });

    it('accepts a Request as well as a Headers object', () => {
      process.env.TRUST_PROXY = 'true';
      const req = new Request('http://localhost', {
        headers: { 'cf-connecting-ip': '203.0.113.7' },
      });
      expect(getClientIp(req)).toBe('203.0.113.7');
    });
  });

  describe('checkRateLimitAsync', () => {
    it('seamlessly falls back to in-memory sliding window when Upstash is not configured', async () => {
      const config = { maxRequests: 2, windowSeconds: 10 };
      const r1 = await checkRateLimitAsync('test-async-1', config);
      expect(r1.success).toBe(true);
      expect(r1.remaining).toBe(1);

      const r2 = await checkRateLimitAsync('test-async-1', config);
      expect(r2.success).toBe(true);
      expect(r2.remaining).toBe(0);

      const r3 = await checkRateLimitAsync('test-async-1', config);
      expect(r3.success).toBe(false);
    });
  });
});
