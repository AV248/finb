import type { NextConfig } from 'next';

const devOrigins = (process.env.FINB_DEV_ORIGINS || '*.e2b.app,*.e2b.dev,localhost,127.0.0.1')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  // FINB ships as an installable PWA. Static export keeps the client deployable to any
  // edge/CDN host while Supabase and Colyseus stay external services.
  output: 'export',
  images: { unoptimized: true },
  experimental: { optimizePackageImports: ['framer-motion'] },
  allowedDevOrigins: devOrigins,
  webpack: config => {
    config.resolve = config.resolve || {};
    config.resolve.alias = { ...(config.resolve.alias || {}), phaser$: 'phaser/dist/phaser.esm.js' };
    return config;
  },
};

export default nextConfig;
