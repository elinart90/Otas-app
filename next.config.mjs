/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  experimental: {
    serverActions: {
      bodySizeLimit: '40mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
