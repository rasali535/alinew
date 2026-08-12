/** @type {import('next').NextConfig} */

// NEXT_STANDALONE=1 is set inside Dockerfile.ralion for server mode.
// By default (or when building for static export / merge-builds), output: 'export' is used.
const isStandalone = process.env.NEXT_STANDALONE === '1';

const nextConfig = {
  output: isStandalone ? 'standalone' : 'export',
  basePath: '/ralion',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
};

module.exports = nextConfig;
