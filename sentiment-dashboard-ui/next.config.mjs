import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_API_BASE_URL:
      process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000',
  },
  webpack(config) {
    config.resolve.alias['@'] = path.resolve(__dirname);
    return config;
  },
}

export default nextConfig 