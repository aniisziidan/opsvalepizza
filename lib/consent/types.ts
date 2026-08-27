export const CURRENT_CONSENT_VERSION = 1;
export const COOKIE_CONSENT_NAME = 'opsvale_consent_v1';

export type ConsentCategory = 'necessary' | 'analytics' | 'marketing' | 'preferences';

export interface CookieConsentRecord {
  version: number;
  timestamp: string;
  necessary: true; // Strictly necessary (always true)
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}

export const DEFAULT_CONSENT_STATE: CookieConsentRecord = {
  version: CURRENT_CONSENT_VERSION,
  timestamp: new Date().toISOString(),
  necessary: true,
  analytics: false,
  marketing: false,
  preferences: false,
};
