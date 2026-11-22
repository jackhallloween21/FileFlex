/** @type {import('next').NextConfig} */
const nextConfig = {
  swcMinify: true,
  output: 'export',      // static site -> works offline
  images: { unoptimized: true },
  webpack: (config, { dev }) => {
    if (!dev) config.cache = false;
    return config;
  },
}

module.exports = nextConfig
