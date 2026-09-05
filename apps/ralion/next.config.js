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
  { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, Accept, X-Requested-With, apikey, x-api-key, x-client-info, Idempotency-Key, Origin, Cache-Control, Pragma, x-user-id, x-workspace-id, x-organization-id, x-tenant-id, x-tenant, x-workspace, x-org-id, x-admin-key, x-session-id, x-request-id, baggage, sentry-trace, cookie' },
  { key: 'Access-Control-Allow-Credentials', value: 'true' },
  { key: 'Access-Control-Max-Age', value: '86400' },
  { key: 'Vary', value: 'Origin, Access-Control-Request-Headers' },
];

const nextConfig = {
  ...(isStandalone ? { output: 'standalone' } : {}),
  basePath: isStandalone ? '' : '/ralion',
  trailingSlash: false,
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  async redirects() {
    if (isStandalone) return [];
    return [
      {
        source: '/',
        destination: '/ralion/dashboard',
        permanent: false,
        basePath: false,
      },
      {
        source: '/login',
        destination: '/ralion/login',
        permanent: false,
        basePath: false,
      },
      {
        source: '/dashboard',
        destination: '/ralion/dashboard',
        permanent: false,
        basePath: false,
      },
      {
        source: '/mari-ai',
        destination: '/ralion/mari-ai',
        permanent: false,
        basePath: false,
      },
      {
        source: '/growth',
        destination: '/ralion/growth',
        permanent: false,
        basePath: false,
      },
      {
        source: '/billing',
        destination: '/ralion/billing',
        permanent: false,
        basePath: false,
      },
      {
        source: '/crm',
        destination: '/ralion/crm',
        permanent: false,
        basePath: false,
      },
      {
        source: '/settings',
        destination: '/ralion/settings',
        permanent: false,
        basePath: false,
      },
      {
        source: '/onboarding',
        destination: '/ralion/onboarding',
        permanent: false,
        basePath: false,
      },
      {
        source: '/_next/:path*',
        destination: '/ralion/_next/:path*',
        permanent: false,
        basePath: false,
      },
    ];
  },
  ...(isStandalone
    ? {
        async rewrites() {
          return [
            {
              source: '/ralion/api/:path*',
              destination: '/api/:path*',
            },
          ];
        },
      }
    : {}),
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
