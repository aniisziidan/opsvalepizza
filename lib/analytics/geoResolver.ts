const EUROPEAN_COUNTRIES: Record<string, string> = {
  DE: 'Germany',
  IT: 'Italy',
  FR: 'France',
  ES: 'Spain',
  GB: 'United Kingdom',
  NL: 'Netherlands',
  PL: 'Poland',
  BE: 'Belgium',
  AT: 'Austria',
  CH: 'Switzerland',
  SE: 'Sweden',
  DK: 'Denmark',
  NO: 'Norway',
  FI: 'Finland',
  PT: 'Portugal',
  IE: 'Ireland',
  GR: 'Greece',
  CZ: 'Czech Republic',
  RO: 'Romania',
  HU: 'Hungary',
  HR: 'Croatia',
  SK: 'Slovakia',
  BG: 'Bulgaria',
  LU: 'Luxembourg',
  SI: 'Slovenia',
  EE: 'Estonia',
  LV: 'Latvia',
  LT: 'Lithuania',
  CY: 'Cyprus',
  MT: 'Malta',
  US: 'United States',
  CA: 'Canada',
  AU: 'Australia',
};

export interface GeoLocation {
  countryCode?: string;
  countryName?: string;
}

export function resolveCountryFromHeaders(headers: Headers): GeoLocation {
  const trustProxy = process.env.TRUST_PROXY === 'true';

  let rawCode: string | null = null;

  if (trustProxy) {
    rawCode =
      headers.get('cf-ipcountry') ||
      headers.get('x-vercel-ip-country') ||
      headers.get('x-country-code') ||
      headers.get('x-geo-country') ||
      null;
  }

  if (rawCode) {
    const code = rawCode.trim().toUpperCase();
    // Validate standard 2-letter ISO code
    if (/^[A-Z]{2}$/.test(code) && code !== 'XX' && code !== 'T1') {
      const countryName = EUROPEAN_COUNTRIES[code] || code;
      return {
        countryCode: code,
        countryName,
      };
    }
  }

  return {
    countryCode: undefined,
    countryName: undefined,
  };
}

export function resolveTrafficSource(
  referrer?: string | null,
  utmSource?: string | null
): 'DIRECT' | 'ORGANIC_SEARCH' | 'REFERRAL' | 'SOCIAL' | 'PAID' | 'OTHER' {
  if (utmSource) {
    const s = utmSource.toLowerCase();
    if (s.includes('google_ads') || s.includes('adwords') || s.includes('cpc') || s.includes('paid')) {
      return 'PAID';
    }
    if (s.includes('linkedin') || s.includes('facebook') || s.includes('twitter') || s.includes('instagram')) {
      return 'SOCIAL';
    }
    if (s.includes('newsletter') || s.includes('email')) {
      return 'OTHER';
    }
  }

  if (!referrer || referrer.trim() === '') {
    return 'DIRECT';
  }

  try {
    const url = new URL(referrer.startsWith('http') ? referrer : `https://${referrer}`);
    const host = url.hostname.toLowerCase();

    // Search engines
    if (
      host.includes('google.') ||
      host.includes('bing.') ||
      host.includes('duckduckgo.') ||
      host.includes('ecosia.') ||
      host.includes('yahoo.') ||
      host.includes('baidu.') ||
      host.includes('yandex.')
    ) {
      return 'ORGANIC_SEARCH';
    }

    // Social
    if (
      host.includes('linkedin.') ||
      host.includes('facebook.') ||
      host.includes('t.co') ||
      host.includes('twitter.') ||
      host.includes('instagram.') ||
      host.includes('reddit.')
    ) {
      return 'SOCIAL';
    }

    return 'REFERRAL';
  } catch {
    return 'DIRECT';
  }
}
