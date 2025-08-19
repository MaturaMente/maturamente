/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  eslint: {
    // Disable ESLint for the entire project during development
    ignoreDuringBuilds: true,
  },

  // Add staleTimes configuration for Next.js 15
  // This configures client-side caching and reuse of page segments
  experimental: {
    // Temporarily disabled to debug dev server issues
    // staleTimes: {
    //   // Cache static content longer (5 minutes)
    //   static: 300,
    //   // Cache dynamic content (with user-specific data) for a shorter time (1 minute)
    //   dynamic: 60,
    // },
    // PPR disabled for production stability - requires canary Next.js
    // ppr: true,
  },

  // Optimize for modern browsers and reduce JavaScript bundle size
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === "production",
  },

  // Configure Webpack for modern browser support and optimization
  webpack: (config, { dev, isServer }) => {
    // Only apply optimizations in production builds
    if (!dev && !isServer) {
      // Optimize for modern browsers (ES2020+)
      config.target = ["web", "es2020"];

      // Enable tree shaking and dead code elimination
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
      };
    }

    return config;
  },

  // Add caching headers for better performance
  async headers() {
    return [
      // Dashboard routes - dynamic but cacheable for short periods
      {
        source: "/dashboard/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
      // API routes - short cache for dynamic data
      {
        source: "/api/((?!auth).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "private, s-maxage=30, stale-while-revalidate=60",
          },
        ],
      },
      // Static pages - longer cache
      {
        source: "/((?!dashboard|api).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
      // Security headers
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
        ],
      },
    ];
  },

  // Optimize images configuration
  images: {
    // Enable modern image formats
    formats: ["image/avif", "image/webp"],

    // Optimize image quality and sizes
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 512, 640, 750],

    // Increase cache TTL for better performance
    minimumCacheTTL: 86400, // 24 hours

    // Configure allowed remote patterns
    remotePatterns: [
      {
        hostname: "lh3.googleusercontent.com",
      },
      {
        hostname: "*.supabase.co",
        protocol: "https",
      },
    ],
  },
};

module.exports = nextConfig;
