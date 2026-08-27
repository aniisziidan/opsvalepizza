import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, resetRateLimit, createRateLimitResponse, getClientIp } from '../rateLimiter';

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

  it('extracts client IP from x-forwarded-for or x-real-ip headers', () => {
    const headers1 = new Headers({ 'x-forwarded-for': '203.0.113.195, 70.41.3.18' });
    expect(getClientIp(headers1)).toBe('203.0.113.195');

    const headers2 = new Headers({ 'x-real-ip': '198.51.100.22' });
    expect(getClientIp(headers2)).toBe('198.51.100.22');

    const headersEmpty = new Headers();
    expect(getClientIp(headersEmpty)).toBe('127.0.0.1');
  });
});
