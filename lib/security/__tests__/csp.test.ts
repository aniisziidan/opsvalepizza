import { describe, it, expect } from 'vitest';
import { buildContentSecurityPolicy } from '../csp';

const scriptSrcOf = (csp: string) =>
  csp.split(';').find((d) => d.trim().startsWith('script-src'))!;

describe('Content Security Policy builder', () => {
  it('uses nonce + strict-dynamic and drops unsafe-inline/eval on strict (dynamic) routes in prod', () => {
    const scriptSrc = scriptSrcOf(
      buildContentSecurityPolicy({ nonce: 'abc123', isProduction: true, useNonce: true }),
    );
    expect(scriptSrc).toContain("'nonce-abc123'");
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
  });

  it('falls back to unsafe-inline (no nonce/eval) on non-nonce routes in prod (SSG pages)', () => {
    const scriptSrc = scriptSrcOf(
      buildContentSecurityPolicy({ nonce: 'abc123', isProduction: true, useNonce: false }),
    );
    expect(scriptSrc).toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain('nonce-');
    expect(scriptSrc).not.toContain("'strict-dynamic'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
  });

  it('always allows unsafe-inline/eval and no nonce in development (HMR), even if useNonce set', () => {
    const scriptSrc = scriptSrcOf(
      buildContentSecurityPolicy({ nonce: 'abc123', isProduction: false, useNonce: true }),
    );
    expect(scriptSrc).toContain("'unsafe-inline'");
    expect(scriptSrc).toContain("'unsafe-eval'");
    expect(scriptSrc).not.toContain('nonce-');
    expect(scriptSrc).not.toContain("'strict-dynamic'");
  });

  it('keeps style-src unsafe-inline in every mode (Next injects inline styles)', () => {
    for (const opts of [
      { isProduction: true, useNonce: true },
      { isProduction: true, useNonce: false },
      { isProduction: false, useNonce: false },
    ] as const) {
      const csp = buildContentSecurityPolicy({ nonce: 'n', ...opts });
      const styleSrc = csp.split(';').find((d) => d.trim().startsWith('style-src'))!;
      expect(styleSrc).toContain("'unsafe-inline'");
    }
  });

  it('locks down the baseline directives regardless of mode', () => {
    const csp = buildContentSecurityPolicy({ nonce: 'n', isProduction: true, useNonce: true });
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("object-src 'none'");
  });
});
