/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async headers() {
    return [
      {
        // HTML documents must always be fresh so an old bundle is never reused
        // after a redeploy (prevents stale "Failed to find Server Action" errors)
        source: '/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
      {
        // Content-hashed build assets can be cached forever (overrides no-store above)
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/auth/admin-login',
        destination: process.env.ADMIN_API_URL || 'http://admin-api:8081/auth/login',
      },
      {
        source: '/auth/admin/refunds/:path*',
        destination: process.env.USER_API_URL || 'http://user-api:8082/auth/admin/refunds/:path*',
      },
      {
        source: '/auth/admin/refunds',
        destination: process.env.USER_API_URL || 'http://user-api:8082/auth/admin/refunds',
      },
      {
        source: '/auth/admin/:path*',
        destination: process.env.ADMIN_API_URL || 'http://admin-api:8081/auth/admin/:path*',
      },
      {
        source: '/auth/:path*',
        destination: process.env.USER_API_URL || 'http://user-api:8082/auth/:path*',
      },
    ];
  },
};

export default nextConfig;
