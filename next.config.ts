import type { NextConfig } from 'next';

// Backend API URL
const BACKEND = 'https://crm-v1-uc-897089213264.us-central1.run.app';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/v1/crm/:path*',
        destination: `${BACKEND}/api/v1/crm/:path*`,
      },
    ];
  },
};

export default nextConfig;
