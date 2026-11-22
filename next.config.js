/** @type {import('next').NextConfig} */
const nextConfig = {
  swcMinify: true,
  output: 'export',      // static site -> works offline
  images: { unoptimized: true },
}

module.exports = nextConfig
