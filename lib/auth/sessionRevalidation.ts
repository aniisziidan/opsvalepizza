/**
 * Session re-validation policy (edge-safe, dependency-free).
 *
 * A JWT is minted once at sign-in and then trusted until it expires. Without a
 * periodic check, an admin who is deactivated (or deleted, or role-changed)
 * *after* their token was issued keeps a valid session until natural expiry.
 * To close that window we re-check the live `AdminUser` record from the JWT
 * callback, but only every `SESSION_REVALIDATE_INTERVAL_MS` so we don't hit the
 * database on every request.
 *
 * This module is intentionally pure so the decision can be unit-tested without
 * Prisma or Auth.js. The actual DB read lives in `lib/auth.ts` (Node runtime).
 */

/** How often the JWT is re-checked against the database. */
export const SESSION_REVALIDATE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Decide whether a token is due for a database re-validation.
 *
 * @param lastValidatedAt epoch ms of the last successful DB check (undefined for
 *   legacy tokens minted before this field existed -> always re-validate).
 * @param now current epoch ms.
 * @param interval minimum ms between checks.
 */
export function needsRevalidation(
  lastValidatedAt: number | undefined,
  now: number,
  interval: number = SESSION_REVALIDATE_INTERVAL_MS,
): boolean {
  if (typeof lastValidatedAt !== 'number' || Number.isNaN(lastValidatedAt)) {
    return true;
  }
  // A clock skew that makes lastValidatedAt appear to be in the future should
  // also trigger a re-check rather than trusting a stale stamp indefinitely.
  if (lastValidatedAt > now) {
    return true;
  }
  return now - lastValidatedAt >= interval;
}
