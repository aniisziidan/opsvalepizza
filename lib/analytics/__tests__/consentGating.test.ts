import { describe, it, expect, beforeEach } from 'vitest';
import { isCategoryAllowed } from '@/lib/consent/consentManager';
import { CookieConsentRecord, CURRENT_CONSENT_VERSION } from '@/lib/consent/types';

describe('GDPR Analytics Consent Gating', () => {
  it('blocks analytics collection prior to explicit consent', () => {
    expect(isCategoryAllowed('analytics', null)).toBe(false);
  });

  it('blocks analytics collection when user rejects analytics cookies', () => {
    const consent: CookieConsentRecord = {
      version: CURRENT_CONSENT_VERSION,
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false,
      timestamp: new Date().toISOString(),
    };

    expect(isCategoryAllowed('analytics', consent)).toBe(false);
    expect(isCategoryAllowed('necessary', consent)).toBe(true);
  });

  it('permits analytics collection when user explicitly opts in', () => {
    const consent: CookieConsentRecord = {
      version: CURRENT_CONSENT_VERSION,
      necessary: true,
      analytics: true,
      marketing: false,
      preferences: true,
      timestamp: new Date().toISOString(),
    };

    expect(isCategoryAllowed('analytics', consent)).toBe(true);
  });
});
