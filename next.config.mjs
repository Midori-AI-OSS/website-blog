/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  
  images: {
    // Enable image optimization in Docker
    // For Docker deployments, we keep optimization enabled for better performance
    unoptimized: false,
    
    // Supported image formats - prefer modern formats for better compression
    formats: ['image/webp', 'image/avif'],
    
    // Allow serving images from the public directory
    // This covers blog images stored in /public/blog/
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'localhost',
      },
    ],
    
    // Image optimization settings
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    
    // Disable static image import optimization for Docker compatibility
    // This ensures images work correctly with hot-reloading and production builds
    disableStaticImages: false,
    
    // Minimize layout shift
    minimumCacheTTL: 60,
  },
};

export default nextConfig;
