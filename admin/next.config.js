/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  // Serve the API under the same origin as the admin so the whole system is
  // reachable through ONE URL (needed for tunnelling / public access). Requests
  // to /api and /sanctum are proxied to the local Laravel server.
  async rewrites() {
    const backend = process.env.BACKEND_ORIGIN || 'http://127.0.0.1:8000';
    return [
      { source: '/api/:path*', destination: `${backend}/api/:path*` },
      { source: '/sanctum/:path*', destination: `${backend}/sanctum/:path*` },
    ];
  },
}

module.exports = nextConfig
