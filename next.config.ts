import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: false, // <-- Changed from true to false
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    // Remove hardcoded dev origins - use environment variables instead
    allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS 
      ? process.env.ALLOWED_DEV_ORIGINS.split(',')
      : [],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve 'async_hooks' or 'fs' on the client-side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        async_hooks: false,
        fs: false,
      };
    }
    return config;
  },
};

export default nextConfig;
