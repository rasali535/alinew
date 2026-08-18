/** @type {import('next').NextConfig} */

// NEXT_STANDALONE=1 is set in Dockerfile.ralion for Render dynamic backend.
// For static web / Hostinger distribution, basePath '/ralion' ensures all asset URLs
// are emitted as /ralion/_next/static/... matching the sub-path deployment.
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

const corsApiHeaders = [
  { key: 'Access-Control-Allow-Origin', value: 'https://rasalilabs.com' },
  { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD' },
  { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, Accept, X-Requested-With, apikey, x-client-info, Idempotency-Key, Origin, Cache-Control, x-user-id, x-organization-id, cookie' },
  { key: 'Access-Control-Allow-Credentials', value: 'true' },
  { key: 'Access-Control-Max-Age', value: '86400' },
];

const nextConfig = {
  ...(isStandalone ? { output: 'standalone' } : {}),
  basePath: isStandalone ? '' : '/ralion',
  trailingSlash: false,
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  ...(isStandalone
    ? {
        async headers() {
          return [
            {
              source: '/api/:path*',
              headers: corsApiHeaders,
            },
            {
              source: '/((?!api).*)',
              headers: securityHeaders,
            },
          ];
        },
      }
    : {}),
};

module.exports = nextConfig;
