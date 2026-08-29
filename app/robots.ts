import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const isProd = process.env.APP_ENV === 'production';
  const appUrl = process.env.APP_URL || 'https://opsvale.com';

  if (!isProd) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    };
  }

  return {
    rules: {
      userAgent: '*',
      // Canonical public content lives under /{locale}/… (e.g. /en/products);
      // `allow: '/'` covers every localized path. The old explicit entries
      // (/calculator, /products, …) were non-localized redirect stubs, not real
      // canonical URLs, so they are dropped in favour of the wildcard.
      allow: '/',
      disallow: ['/admin/', '/proposals/', '/api/'],
    },
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
