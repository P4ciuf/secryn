import type { NextConfig } from "next";

/**
 * Next.js configuration for the Secryn application.
 *
 * Sets up security headers (X-Frame-Options, X-Content-Type-Options,
 * Referrer-Policy), API-layer cache/noindex metadata, long-lived static
 * asset caching, image optimization with WebP/AVIF formats, and tree-shaking
 * for the two largest client-bundle dependencies.
 */
const nextConfig: NextConfig = {
  // File polling is required on Docker/WSL2 volumes because inotify events
  // from the host don't propagate to the container via 9p/gRPC FUSE mounts.
  watchOptions: {
    pollIntervalMs: 300,
  },

  // Compress responses for faster page loads (improves LCP / FCP)
  compress: true,

  // HTTP response headers applied per route segment.
  // Routes: global security headers, API noindex/no-store, static asset caching.
  async headers() {
    return [
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
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
        ],
      },
      {
        source: "/api/(.*)",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow",
          },
          {
            key: "Cache-Control",
            value: "no-store, must-revalidate",
          },
        ],
      },
      {
        source: "/:path*(.svg|.png|.jpg|.webp|.ico|.woff2?)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  // Prevent leaking framework version in the X-Powered-By response header.
  poweredByHeader: false,

  images: {
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  reactStrictMode: true,

  experimental: {
    // Tree-shake icon and animation libraries to reduce client bundle size.
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
};

export default nextConfig;
