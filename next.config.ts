import type { NextConfig } from "next";
import path from "path";

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
              // Cloudflare Turnstile loader script.
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https://images.unsplash.com https://*.supabase.co",
              "font-src 'self' data: https://fonts.gstatic.com",
              // Supabase Realtime uses wss://; https:// alone is not enough for connect-src on strict mobile browsers.
              // Cloudflare Turnstile makes XHR requests from inside its iframe.
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com",
              // Turnstile renders a challenge iframe served from challenges.cloudflare.com.
              "frame-src https://challenges.cloudflare.com",
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

export default nextConfig;
