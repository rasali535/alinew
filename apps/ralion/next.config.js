/** @type {import('next').NextConfig} */

// NEXT_STANDALONE=1 is set inside Dockerfile.ralion for server mode.
// By default (or when building for static export / merge-builds), output: 'export' is used.
const isStandalone = process.env.NEXT_STANDALONE === '1';

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
  output: isStandalone ? 'standalone' : 'export',
  basePath: '/ralion',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  ...(isStandalone
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
