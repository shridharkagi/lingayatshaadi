import type { Metadata, Viewport } from "next";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import "./globals.css";
import { getPublicSiteUrl } from "@/lib/siteUrl";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppConfigProvider } from "@/contexts/AppConfigContext";
import { ContactFloat } from "@/components/ui/ContactFloat";
import { ConfigInjector } from "@/components/ConfigInjector";
import { AuthModalProvider } from "@/contexts/AuthModalContext";
import { TurnstileProvider } from "@/components/turnstile/TurnstileProvider";
import { InstallPWAButton } from "@/components/pwa/InstallPWAButton";
function getSeoConfig() {
  try {
    const path = join(process.cwd(), "data", "site-config.json");
    if (existsSync(path)) {
      const data = JSON.parse(readFileSync(path, "utf-8"));
      return {
        description: data.seoDescription || "Premium matrimonial platform for the Lingayat community",
        keywords: data.seoKeywords || "Lingayat matrimony, LingayatBandhu, Lingayat marriage",
      };
    }
  } catch {
    // ignore
  }
  return {
    description: "Premium matrimonial platform for the Lingayat community",
    keywords: "Lingayat matrimony, LingayatBandhu, Lingayat marriage",
  };
}

const seo = getSeoConfig();
const siteUrl = getPublicSiteUrl();

export const metadata: Metadata = {
  title: "LingayatBandhu — Find your Lingayat match",
  description: seo.description,
  manifest: "/manifest.json",
  keywords: seo.keywords,
  authors: [{ name: "LingayatBandhu" }],
  creator: "LingayatBandhu",
  publisher: "LingayatBandhu",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LingayatBandhu",
  },
  icons: {
    apple: "/icons/icon-192x192.png",
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteUrl,
    siteName: "LingayatBandhu",
    title: "LingayatBandhu — Find your Lingayat match",
    description: seo.description,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "LingayatBandhu — Lingayat matrimony",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LingayatBandhu — Find your Lingayat match",
    description: seo.description,
    images: ["/opengraph-image"],
  },
  metadataBase: new URL(siteUrl),
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#8b0000",
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

/**
 * Origin hostnames we contact on the auth-critical path. Establishing the TCP +
 * TLS handshake before the user clicks Sign In shaves 50-200ms off the first
 * login on a cold visit. Subsequent navigations reuse the warm connection.
 *
 *  - challenges.cloudflare.com → Turnstile widget + siteverify endpoint
 *  - <project>.supabase.co     → Supabase Auth + PostgREST
 */
function getAuthCriticalOrigins(): string[] {
  const origins = new Set<string>(["https://challenges.cloudflare.com"]);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (supabaseUrl) {
    try {
      const u = new URL(supabaseUrl);
      origins.add(`${u.protocol}//${u.host}`);
    } catch {
      // ignore: misconfigured env, no-op
    }
  }
  return Array.from(origins);
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const preconnectOrigins = getAuthCriticalOrigins();
  return (
    <html lang="en">
      <head>
        {preconnectOrigins.map((origin) => (
          <link key={origin} rel="preconnect" href={origin} crossOrigin="anonymous" />
        ))}
      </head>
      <body className="antialiased min-h-screen">
        <TurnstileProvider>
          <AuthProvider>
            <AppConfigProvider>
              <AuthModalProvider>
                {children}
                <InstallPWAButton />
                <ContactFloat />
                <ConfigInjector />
                <div id="lingayat-external-scripts" suppressHydrationWarning />
              </AuthModalProvider>
            </AppConfigProvider>
          </AuthProvider>
        </TurnstileProvider>
      </body>
    </html>
  );
}
