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
      allow: ['/', '/calculator', '/products', '/how-it-works', '/about', '/quote'],
      disallow: ['/admin/', '/proposals/', '/api/'],
    },
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
