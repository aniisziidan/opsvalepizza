import { describe, it, expect } from 'vitest';
import { isCronAuthorized } from '../auth';

describe('Cron request authorization', () => {
  it('fails closed when no secret is configured in production', () => {
    expect(isCronAuthorized('Bearer anything', undefined, true).authorized).toBe(false);
    expect(isCronAuthorized(null, '', true).authorized).toBe(false);
    expect(isCronAuthorized(null, '   ', true).authorized).toBe(false);
  });

  it('allows an unconfigured secret outside production (dev/test convenience)', () => {
    expect(isCronAuthorized(null, undefined, false).authorized).toBe(true);
  });

  it('rejects a missing or wrong bearer token when a secret is set', () => {
    expect(isCronAuthorized(null, 'sekret', true).authorized).toBe(false);
    expect(isCronAuthorized('Bearer nope', 'sekret', true).authorized).toBe(false);
    expect(isCronAuthorized('Bearer ', 'sekret', true).authorized).toBe(false);
  });

  it('accepts a correct bearer token when a secret is set (case-insensitive scheme)', () => {
    expect(isCronAuthorized('Bearer sekret', 'sekret', true).authorized).toBe(true);
    expect(isCronAuthorized('bearer sekret', 'sekret', false).authorized).toBe(true);
  });
});
