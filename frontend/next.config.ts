import type { NextConfig } from 'next';

const backendUrl = process.env.BACKEND_URL ?? 'http://127.0.0.1:3001';

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
        { source: '/health', destination: `${backendUrl}/health` },
        { source: '/contracts', destination: '/contracts.html' },
        { source: '/contracts/new/choose-person', destination: '/contract-author-choose-person.html' },
        { source: '/contracts/new/project-details', destination: '/contract-author-project-details.html' },
        { source: '/contracts/new/review-terms', destination: '/contract-author-review-terms.html' },
        { source: '/contracts/new/send', destination: '/contract-author-send.html' },
        { source: '/contracts/:contractId/choose-person', destination: '/contract-author-choose-person.html' },
        { source: '/contracts/:contractId/project-details', destination: '/contract-author-project-details.html' },
        { source: '/contracts/:contractId/review-terms', destination: '/contract-author-review-terms.html' },
        { source: '/contracts/:contractId/send', destination: '/contract-author-send.html' },
        { source: '/contracts/:contractId', destination: '/contract.html' },
        { source: '/wallet', destination: '/wallet.html' },
        { source: '/authorities', destination: '/authorities.html' }
      ]
    };
  }
};

export default nextConfig;
