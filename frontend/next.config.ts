import type { NextConfig } from 'next';

const backendUrl = process.env.BACKEND_URL ?? 'http://127.0.0.1:3001';

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
        { source: '/health', destination: `${backendUrl}/health` },
        { source: '/wallet', destination: '/wallet.html' },
      ]
    };
  }
};

export default nextConfig;
