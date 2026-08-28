import { getClientConsent } from '@/lib/consent/consentManager';
import { AnalyticsEventType, DeviceType } from '@prisma/client';
import { AnalyticsEventInput } from './types';

const VISITOR_COOKIE_NAME = 'opsvale_vid';
const SESSION_STORAGE_KEY = 'opsvale_sid';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(^|;\\s*)(${name})=([^;]+)`));
  return match ? decodeURIComponent(match[3]) : null;
}

function setCookie(name: string, value: string, maxAgeSeconds = 365 * 24 * 60 * 60): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
}

function clearCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function getOrCreateVisitorId(): string | null {
  const consent = getClientConsent();
  if (!consent?.analytics) {
    clearCookie(VISITOR_COOKIE_NAME);
    return null;
  }

  let vid = getCookie(VISITOR_COOKIE_NAME);
  if (!vid) {
    vid = `v_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
    setCookie(VISITOR_COOKIE_NAME, vid);
  }
  return vid;
}

export function getOrCreateSessionId(): string | null {
  const consent = getClientConsent();
  if (!consent?.analytics) {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
    return null;
  }

  if (typeof sessionStorage === 'undefined') return null;

  let sid = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!sid) {
    sid = `s_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
    sessionStorage.setItem(SESSION_STORAGE_KEY, sid);
  }
  return sid;
}

export function getUtmParams(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const utms: Record<string, string> = {};

  const map: Record<string, string> = {
    utm_source: 'utmSource',
    utm_medium: 'utmMedium',
    utm_campaign: 'utmCampaign',
    utm_term: 'utmTerm',
    utm_content: 'utmContent',
  };

  for (const [key, prop] of Object.entries(map)) {
    const val = params.get(key);
    if (val) utms[prop] = val;
  }

  return utms;
}

export function trackEvent(
  eventType: AnalyticsEventType,
  payload: Partial<AnalyticsEventInput> = {}
): void {
  if (typeof window === 'undefined') return;

  // 1. GDPR Consent Check
  const consent = getClientConsent();
  if (!consent || !consent.analytics) {
    return; // Dropped without consent
  }

  const visitorId = getOrCreateVisitorId();
  const sessionId = getOrCreateSessionId();
  const utms = getUtmParams();

  const fullPayload: AnalyticsEventInput = {
    anonymousVisitorId: visitorId || undefined,
    sessionToken: sessionId || undefined,
    eventType,
    path: payload.path || window.location.pathname,
    canonicalPath: payload.canonicalPath,
    locale: payload.locale || (window.location.pathname.split('/')[1] || 'en'),
    referrer: payload.referrer || (document.referrer ? document.referrer : undefined),
    utmSource: payload.utmSource || utms.utmSource,
    utmMedium: payload.utmMedium || utms.utmMedium,
    utmCampaign: payload.utmCampaign || utms.utmCampaign,
    utmTerm: payload.utmTerm || utms.utmTerm,
    utmContent: payload.utmContent || utms.utmContent,
    deviceType: payload.deviceType,
    metadata: payload.metadata,
  };

  const body = JSON.stringify(fullPayload);

  // Send beacon if supported, fallback to fetch with keepalive
  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon('/api/analytics/collect', blob);
  } else {
    fetch('/api/analytics/collect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  }
}

export function trackPageView(path?: string, canonicalPath?: string, title?: string): void {
  trackEvent('PAGE_VIEW', {
    path,
    canonicalPath,
    metadata: title ? { title } : undefined,
  });
}

export function trackCalculatorEvent(
  type: 'CALCULATOR_OPENED' | 'CALCULATOR_USED' | 'CALCULATOR_COMPLETED',
  metadata?: Record<string, any>
): void {
  trackEvent(type, { metadata });
}

export function trackQuoteEvent(
  type: 'QUOTE_PAGE_OPENED' | 'QUOTE_REQUEST_STARTED' | 'QUOTE_REQUEST_SUBMITTED',
  metadata?: Record<string, any>
): void {
  trackEvent(type, { metadata });
}

export function trackCtaClick(
  ctaName: string,
  location: string,
  destinationUrl?: string
): void {
  trackEvent('CTA_CLICKED', {
    metadata: {
      ctaName,
      location,
      destinationUrl,
    },
  });
}

export function trackProductView(
  productSize: string,
  material: string,
  print: string
): void {
  trackEvent('PRODUCT_VIEWED', {
    metadata: {
      productSize,
      material,
      print,
    },
  });
}
