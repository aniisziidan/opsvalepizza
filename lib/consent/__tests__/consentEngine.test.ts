import { describe, it, expect } from 'vitest';
import {
  parseConsentCookie,
  serializeConsentCookie,
  isCategoryAllowed,
  hasServerConsent,
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

  describe('server-side consent enforcement (from Cookie header)', () => {
    const consentCookie = (analytics: boolean): string => {
      const record: CookieConsentRecord = {
        version: CURRENT_CONSENT_VERSION,
        timestamp: new Date().toISOString(),
        necessary: true,
        analytics,
        marketing: false,
        preferences: false,
      };
      // serializeConsentCookie returns "name=value; Path=/; ..." — keep only the name=value pair
      return serializeConsentCookie(record).split(';')[0];
    };

    it('grants analytics when the consent cookie allows it (amid other cookies)', () => {
      const header = `foo=bar; ${consentCookie(true)}; baz=qux`;
      expect(hasServerConsent(header, 'analytics')).toBe(true);
    });

    it('denies analytics when the consent cookie withholds it', () => {
      expect(hasServerConsent(consentCookie(false), 'analytics')).toBe(false);
    });

    it('denies analytics when no consent cookie is present', () => {
      expect(hasServerConsent('other=1; another=2', 'analytics')).toBe(false);
      expect(hasServerConsent(null, 'analytics')).toBe(false);
      expect(hasServerConsent(undefined, 'analytics')).toBe(false);
    });

    it('always allows the necessary category regardless of cookie', () => {
      expect(hasServerConsent(null, 'necessary')).toBe(true);
    });
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
