/** @type {import('next').NextConfig} */

// When running inside Docker (NODE_ENV=production + no NEXT_STATIC_EXPORT flag),
// we use standalone server mode so API routes work server-side.
// For legacy static builds (e.g. old Render deploys), set NEXT_STATIC_EXPORT=1.
const isStaticExport = process.env.NEXT_STATIC_EXPORT === '1';

const nextConfig = {
  // Server mode by default — enables real API routes, OAuth callbacks, etc.
  // Switch to 'export' only when NEXT_STATIC_EXPORT=1 (legacy Render static host)
  ...(isStaticExport
    ? { output: 'export' }
    : { output: 'standalone' }),

  basePath: '/ralion',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
};

module.exports = nextConfig;
