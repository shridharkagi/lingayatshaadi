import type { NextConfig } from "next";
import path from "path";
import withPWAInit from "next-pwa";

/** Use this app folder as root so Next does not pick a parent directory that has another package-lock.json. */
const projectRoot = path.join(__dirname);

const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
  async headers() {
    // Skip security headers in development to avoid CSP issues
    if (process.env.NODE_ENV === "development") {
      return [];
    }
    
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Turnstile + GA/GTM + tawk.to + Microsoft Clarity + Hotjar (superadmin scripts).
              [
                "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
                "https://challenges.cloudflare.com",
                "https://www.googletagmanager.com https://*.googletagmanager.com",
                "https://www.google-analytics.com https://ssl.google-analytics.com https://*.google-analytics.com",
                "https://*.hotjar.com",
                "https://*.tawk.to",
                "https://*.clarity.ms",
              ].join(" "),
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              [
                "img-src 'self' data: blob:",
                "https://images.unsplash.com https://*.supabase.co",
                "https://www.google-analytics.com https://www.googletagmanager.com",
                "https://*.hotjar.com https://*.tawk.to https://*.clarity.ms https://c.clarity.ms",
              ].join(" "),
              "font-src 'self' data: https://fonts.gstatic.com",
              [
                "connect-src 'self'",
                "https://*.supabase.co wss://*.supabase.co",
                "https://challenges.cloudflare.com",
                "https://www.google-analytics.com https://*.google-analytics.com https://analytics.google.com",
                "https://www.googletagmanager.com https://*.googletagmanager.com https://stats.g.doubleclick.net",
                "https://*.hotjar.com wss://*.hotjar.com",
                "https://*.tawk.to wss://*.tawk.to",
                "https://*.clarity.ms",
              ].join(" "),
              "worker-src 'self' blob: https://challenges.cloudflare.com https://*.hotjar.com https://*.clarity.ms",
              [
                "frame-src",
                "https://challenges.cloudflare.com",
                "https://www.googletagmanager.com https://*.googletagmanager.com",
                "https://*.tawk.to",
                "https://*.hotjar.com",
              ].join(" "),
              "frame-ancestors 'none'",
            ]
              .join("; ")
              .replace(/\s+/g, " "),
          },
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
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

export default withPWA(nextConfig);
