/** @type {import('next').NextConfig} */

// Default to standalone server mode to support full dynamic API routes and OAuth endpoints.
// Set NEXT_STATIC_EXPORT=1 only when building for a static HTML host.
const isStaticExport = process.env.NEXT_STATIC_EXPORT === '1';

const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
];

const nextConfig = {
  output: isStaticExport ? 'export' : 'standalone',
  basePath: isStaticExport ? '/ralion' : '',
  trailingSlash: isStaticExport,
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  ...(!isStaticExport
    ? {
        async headers() {
          return [
            {
              source: '/(.*)',
              headers: securityHeaders,
            },
          ];
        },
      }
    : {}),
};

module.exports = nextConfig;
