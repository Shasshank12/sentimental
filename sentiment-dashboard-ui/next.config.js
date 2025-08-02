const path = require('path');
console.log("WEBPACK ALIAS RESOLVING TO:", path.resolve(process.cwd(), 'lib'));

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
    config.resolve.alias['@'] = path.resolve(process.cwd(), 'lib');
    return config;
  },
};

module.exports = nextConfig; 