/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Skip ESLint during production builds (CI/Vercel)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Skip type-checking during builds to avoid TS flag incompatibilities on CI
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.API_URL
          ? `${process.env.API_URL}/api/:path*`
          : 'http://localhost:3333/api/:path*',
      },
    ];
  },
};

export default nextConfig;
