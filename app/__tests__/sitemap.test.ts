import { describe, it, expect } from 'vitest';
import sitemap from '../sitemap';
import { LOCALES } from '@/lib/i18n/config';

describe('sitemap.xml generation', () => {
  it('emits a localized entry for every locale root', () => {
    const urls = sitemap().map((e) => e.url);
    for (const locale of LOCALES) {
      expect(urls.some((u) => u.endsWith(`/${locale}`))).toBe(true);
    }
  });

  it('never exposes admin, api, or proposal routes', () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls.some((u) => /\/(admin|api|proposals)(\/|$)/.test(u))).toBe(false);
  });

  it('builds absolute URLs from APP_URL for each locale/path combination', () => {
    const entries = sitemap();
    expect(entries.length).toBeGreaterThanOrEqual(LOCALES.length);
    for (const e of entries) {
      expect(e.url).toMatch(/^https?:\/\//);
    }
  });
});
