import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    // FIX: Alias '@' to the 'lib' folder inside your project
    config.resolve.alias['@'] = path.resolve(__dirname, 'lib');
    return config;
  },
};

export default nextConfig; 