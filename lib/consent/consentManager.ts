import {
  CookieConsentRecord,
  COOKIE_CONSENT_NAME,
  CURRENT_CONSENT_VERSION,
  DEFAULT_CONSENT_STATE,
  ConsentCategory,
} from './types';

/**
 * Parses raw cookie string into validated CookieConsentRecord.
 * Returns null if cookie is missing or has outdated version (triggering re-prompt).
 */
export function parseConsentCookie(cookieStr: string | null | undefined): CookieConsentRecord | null {
  if (!cookieStr) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(cookieStr));
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      parsed.version === CURRENT_CONSENT_VERSION &&
      parsed.necessary === true &&
      typeof parsed.analytics === 'boolean' &&
      typeof parsed.marketing === 'boolean' &&
      typeof parsed.preferences === 'boolean'
    ) {
      return parsed as CookieConsentRecord;
    }
  } catch {
    // Malformed cookie
  }

  return null;
}

/**
 * Serializes CookieConsentRecord into safe cookie string with 1-year expiration, SameSite=Lax.
 */
export function serializeConsentCookie(record: CookieConsentRecord): string {
  const jsonStr = JSON.stringify(record);
  const maxAge = 365 * 24 * 60 * 60; // 1 year in seconds
  return `${COOKIE_CONSENT_NAME}=${encodeURIComponent(jsonStr)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

/**
 * Server-side helper: extract the consent record from a raw `Cookie` request header.
 * Mirrors {@link getClientConsent} but works from `req.headers.get('cookie')`.
 */
export function getConsentFromCookieHeader(
  cookieHeader: string | null | undefined,
): CookieConsentRecord | null {
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const name = part.slice(0, idx).trim();
    if (name !== COOKIE_CONSENT_NAME) continue;
    const val = part.slice(idx + 1).trim();
    if (val) return parseConsentCookie(val);
  }

  return null;
}

/**
 * Server-side consent gate: returns whether a given category is authorized based on the raw
 * `Cookie` header. Used to enforce GDPR consent on ingestion endpoints so that a persistent
 * identifier cannot be stored for a visitor who never consented — regardless of what the client
 * chooses to send.
 */
export function hasServerConsent(
  cookieHeader: string | null | undefined,
  category: ConsentCategory,
): boolean {
  return isCategoryAllowed(category, getConsentFromCookieHeader(cookieHeader));
}

/**
 * Client-side helper to read consent from document.cookie.
 */
export function getClientConsent(): CookieConsentRecord | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';');
  for (const c of cookies) {
    const [name, val] = c.trim().split('=');
    if (name === COOKIE_CONSENT_NAME && val) {
      return parseConsentCookie(val);
    }
  }

  return null;
}

/**
 * Client-side helper to save consent into document.cookie.
 */
export function saveClientConsent(record: CookieConsentRecord): void {
  if (typeof document === 'undefined') return;
  document.cookie = serializeConsentCookie(record);
  // Dispatch custom event so listeners can re-evaluate tracker executions
  window.dispatchEvent(new CustomEvent('opsvale_consent_updated', { detail: record }));
}

/**
 * Evaluates whether a given consent category is authorized.
 * Returns false prior to explicit user consent.
 */
export function isCategoryAllowed(category: ConsentCategory, consent: CookieConsentRecord | null): boolean {
  if (category === 'necessary') return true;
  if (!consent) return false;
  return Boolean(consent[category]);
}
