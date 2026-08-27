import { describe, it, expect } from 'vitest';
import {
  parseConsentCookie,
  serializeConsentCookie,
  isCategoryAllowed,
} from '../consentManager';
import { CURRENT_CONSENT_VERSION, CookieConsentRecord } from '../types';

describe('GDPR Cookie Consent Engine', () => {
  it('blocks optional trackers by default before explicit consent', () => {
    expect(isCategoryAllowed('necessary', null)).toBe(true);
    expect(isCategoryAllowed('analytics', null)).toBe(false);
    expect(isCategoryAllowed('marketing', null)).toBe(false);
    expect(isCategoryAllowed('preferences', null)).toBe(false);
  });

  it('correctly serializes and parses a valid consent cookie', () => {
    const record: CookieConsentRecord = {
      version: CURRENT_CONSENT_VERSION,
      timestamp: new Date().toISOString(),
      necessary: true,
      analytics: true,
      marketing: false,
      preferences: true,
    };

    const cookieStr = serializeConsentCookie(record);
    const match = cookieStr.match(/opsvale_consent_v1=([^;]+)/);
    expect(match).toBeTruthy();

    const parsed = parseConsentCookie(match![1]);
    expect(parsed).toEqual(record);
    expect(isCategoryAllowed('analytics', parsed)).toBe(true);
    expect(isCategoryAllowed('marketing', parsed)).toBe(false);
  });

  it('invalidates outdated consent versions to trigger re-prompts', () => {
    const outdatedRecord = {
      version: 0, // Old version
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true,
    };

    const cookieVal = encodeURIComponent(JSON.stringify(outdatedRecord));
    const parsed = parseConsentCookie(cookieVal);
    expect(parsed).toBeNull(); // Outdated version rejected
  });
});
