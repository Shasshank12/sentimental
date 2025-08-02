const path = require('path');

console.log("WEBPACK ALIAS RESOLVING TO:", path.resolve(process.cwd()));

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
    // FIX: Alias '@' to the ROOT directory
    config.resolve.alias['@'] = path.resolve(process.cwd());  // NOT lib
    return config;
  },
};

module.exports = nextConfig; 