import { MetadataRoute } from 'next';
import { LOCALES } from '@/lib/i18n/config';

// Public, indexable localized pages (relative to /{locale}). '' is the locale home.
const PUBLIC_PATHS = [
  '',
  'products',
  'how-it-works',
  'about',
  'calculator',
  'quote',
  'privacy',
  'cookies',
  'terms',
  'imprint',
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const appUrl = (process.env.APP_URL || 'https://opsvale.com').replace(/\/$/, '');
  const lastModified = new Date();

  const entries: MetadataRoute.Sitemap = [];
  for (const locale of LOCALES) {
    for (const path of PUBLIC_PATHS) {
      const isHome = path === '';
      entries.push({
        url: isHome ? `${appUrl}/${locale}` : `${appUrl}/${locale}/${path}`,
        lastModified,
        changeFrequency: isHome ? 'weekly' : 'monthly',
        priority: isHome ? 1 : 0.7,
      });
    }
  }

  return entries;
}
