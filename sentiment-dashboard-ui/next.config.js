/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Image optimization settings
  images: {
    unoptimized: true,
  },

  // Environment variables (if needed)
  env: {
    // NewsAPI key should be set in Vercel environment variables
    NEWSAPI_KEY: process.env.NEWSAPI_KEY,
  },
}

module.exports = nextConfig
