import crypto from 'node:crypto';

export interface CronAuthResult {
  authorized: boolean;
  reason?: string;
}

/** Length-safe, constant-time string comparison to avoid leaking the secret via timing. */
function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) {
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
}

/**
 * Authorizes a cron trigger request.
 *
 * Fails closed: if no `CRON_SECRET` is configured, the endpoint is only open in non-production
 * environments (developer convenience). In production an unset secret is treated as a
 * misconfiguration and access is denied, so a cron endpoint is never left unauthenticated.
 */
export function isCronAuthorized(
  authHeader: string | null | undefined,
  secret: string | undefined,
  isProduction: boolean,
): CronAuthResult {
  const trimmedSecret = secret?.trim();

  if (!trimmedSecret) {
    if (isProduction) {
      return { authorized: false, reason: 'CRON_SECRET must be configured in production' };
    }
    return { authorized: true };
  }

  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
  if (token && constantTimeEqual(token, trimmedSecret)) {
    return { authorized: true };
  }

  return { authorized: false, reason: 'Invalid or missing cron token' };
}

/** Convenience wrapper reading the current environment from process.env. */
export function isProductionEnv(): boolean {
  return process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production';
}
