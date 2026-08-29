export interface CspOptions {
  /** Per-request nonce. Only applied to script-src when `useNonce` is true (dynamic routes). */
  nonce: string;
  isProduction: boolean;
  /**
   * Whether to use the strict nonce-based script policy. Only viable on **dynamically rendered**
   * routes, because Next.js can only stamp the per-request nonce onto scripts at request time.
   * Statically generated (SSG) pages emit inline scripts at build time with no nonce, so they
   * must fall back to `'unsafe-inline'`.
   */
  useNonce: boolean;
}

/**
 * Builds the Content-Security-Policy header value.
 *
 * Strict (production + dynamic route): scripts are restricted to a per-request `'nonce-…'` plus
 * `'strict-dynamic'`, dropping `'unsafe-inline'`/`'unsafe-eval'` — an injected inline script
 * cannot execute. Next.js applies the nonce to its framework scripts automatically when the CSP
 * is present on the request headers, and `'strict-dynamic'` lets those trusted scripts load the
 * app's chunks. Used for `/admin/**` and `/proposals/**`.
 *
 * Fallback (production + SSG route): keeps `'unsafe-inline'` (no nonce is possible for prebuilt
 * inline scripts) but still omits `'unsafe-eval'`.
 *
 * Development: always `'unsafe-inline'`/`'unsafe-eval'` (required by React Fast Refresh / HMR) and
 * never a nonce — a nonce alongside `'unsafe-inline'` makes browsers ignore the latter.
 *
 * `style-src` retains `'unsafe-inline'` in every mode because Next injects inline styles.
 */
export function buildContentSecurityPolicy({ nonce, isProduction, useNonce }: CspOptions): string {
  let scriptSrc: string;
  if (!isProduction) {
    scriptSrc = "script-src 'self' 'unsafe-inline' 'unsafe-eval'";
  } else if (useNonce) {
    scriptSrc = `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`;
  } else {
    scriptSrc = "script-src 'self' 'unsafe-inline'";
  }

  const directives = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ];

  return directives.join('; ');
}
