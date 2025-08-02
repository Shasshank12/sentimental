import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'https://sentimental-ai-vvo0.onrender.com',
  },
  webpack: (config) => {
    // Use process.cwd() to correctly resolve to project root
    config.resolve.alias['@'] = path.resolve(process.cwd(), 'lib');
    return config;
  },
};

export default nextConfig; 