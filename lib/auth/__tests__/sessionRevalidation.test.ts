import { describe, it, expect } from 'vitest';
import {
  needsRevalidation,
  SESSION_REVALIDATE_INTERVAL_MS,
} from '../sessionRevalidation';

describe('needsRevalidation', () => {
  const now = 1_000_000_000_000;

  it('re-validates legacy tokens with no lastValidatedAt', () => {
    expect(needsRevalidation(undefined, now)).toBe(true);
  });

  it('re-validates when the stamp is not a number', () => {
    // @ts-expect-error exercising a corrupt token payload
    expect(needsRevalidation('nope', now)).toBe(true);
    expect(needsRevalidation(NaN, now)).toBe(true);
  });

  it('does not re-validate immediately after a fresh check', () => {
    expect(needsRevalidation(now, now)).toBe(false);
  });

  it('does not re-validate within the interval', () => {
    const lastValidatedAt = now - (SESSION_REVALIDATE_INTERVAL_MS - 1);
    expect(needsRevalidation(lastValidatedAt, now)).toBe(false);
  });

  it('re-validates exactly at the interval boundary', () => {
    const lastValidatedAt = now - SESSION_REVALIDATE_INTERVAL_MS;
    expect(needsRevalidation(lastValidatedAt, now)).toBe(true);
  });

  it('re-validates once the interval has elapsed', () => {
    const lastValidatedAt = now - (SESSION_REVALIDATE_INTERVAL_MS + 60_000);
    expect(needsRevalidation(lastValidatedAt, now)).toBe(true);
  });

  it('re-validates when the stamp is in the future (clock skew)', () => {
    expect(needsRevalidation(now + 60_000, now)).toBe(true);
  });

  it('honours a custom interval', () => {
    expect(needsRevalidation(now - 500, now, 1_000)).toBe(false);
    expect(needsRevalidation(now - 1_500, now, 1_000)).toBe(true);
  });
});
