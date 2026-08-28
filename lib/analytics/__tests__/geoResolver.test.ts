import { describe, it, expect, beforeEach } from 'vitest';
import { resolveCountryFromHeaders, resolveTrafficSource } from '../geoResolver';

describe('Geo Resolver & Traffic Source Classifier', () => {
  beforeEach(() => {
    delete process.env.TRUST_PROXY;
  });

  it('rejects client geo headers when TRUST_PROXY is not enabled', () => {
    process.env.TRUST_PROXY = 'false';
    const headers = new Headers();
    headers.set('cf-ipcountry', 'DE');

    const result = resolveCountryFromHeaders(headers);
    expect(result.countryCode).toBeUndefined();
    expect(result.countryName).toBeUndefined();
  });

  it('resolves country from trusted proxy headers when TRUST_PROXY is enabled', () => {
    process.env.TRUST_PROXY = 'true';
    const headers = new Headers();
    headers.set('cf-ipcountry', 'IT');

    const result = resolveCountryFromHeaders(headers);
    expect(result.countryCode).toBe('IT');
    expect(result.countryName).toBe('Italy');
  });

  it('correctly maps various European country codes', () => {
    process.env.TRUST_PROXY = 'true';
    const check = (code: string, expectedName: string) => {
      const headers = new Headers({ 'x-vercel-ip-country': code });
      const res = resolveCountryFromHeaders(headers);
      expect(res.countryCode).toBe(code);
      expect(res.countryName).toBe(expectedName);
    };

    check('DE', 'Germany');
    check('FR', 'France');
    check('ES', 'Spain');
    check('NL', 'Netherlands');
    check('PL', 'Poland');
  });

  it('classifies traffic sources accurately based on referrer and UTMs', () => {
    expect(resolveTrafficSource(null, null)).toBe('DIRECT');
    expect(resolveTrafficSource('https://www.google.de/search?q=pizza+boxes', null)).toBe('ORGANIC_SEARCH');
    expect(resolveTrafficSource('https://www.bing.com/', null)).toBe('ORGANIC_SEARCH');
    expect(resolveTrafficSource('https://www.linkedin.com/feed/', null)).toBe('SOCIAL');
    expect(resolveTrafficSource('https://packaging-news.eu/article-123', null)).toBe('REFERRAL');
    expect(resolveTrafficSource(null, 'google_ads')).toBe('PAID');
    expect(resolveTrafficSource(null, 'cpc')).toBe('PAID');
  });
});
