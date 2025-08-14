import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-anon-key',
  },
  typescript: {
    ignoreBuildErrors: false, // 生產環境應檢查 TypeScript 錯誤
  },
  eslint: {
    ignoreDuringBuilds: false, // 生產環境應檢查 ESLint 錯誤
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
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve 'async_hooks' or 'fs' on the client-side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        async_hooks: false,
        fs: false,
      };
    }

    // Alias problematic libraries during production build to avoid breaking APIs
    if (process.env.NODE_ENV === 'production') {
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        'react-joyride': path.resolve(__dirname, 'src/shims/react-joyride.tsx'),
      };
    }
    return config;
  },
};

export default nextConfig;
