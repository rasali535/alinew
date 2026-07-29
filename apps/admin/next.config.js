/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/admin',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
};

module.exports = nextConfig;
