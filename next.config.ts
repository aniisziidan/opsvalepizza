import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';
const isProdEnv = process.env.APP_ENV === 'production';

// NOTE: Content-Security-Policy is set per-request in `middleware.ts` so it can carry a unique
// script nonce (`'nonce-…' 'strict-dynamic'`) instead of `'unsafe-inline'`. It is intentionally
// NOT declared here — a static header cannot vary the nonce per request.
const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  // HSTS applied strictly in production over HTTPS, omitted on localhost
  ...(isProd
    ? [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=31536000; includeSubDomains',
        },
      ]
    : []),
  // Non-production deployments receive X-Robots-Tag to prevent accidental search engine indexation
  ...(!isProdEnv
    ? [
        {
          key: 'X-Robots-Tag',
          value: 'noindex, nofollow, noarchive',
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
