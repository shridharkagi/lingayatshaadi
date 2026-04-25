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
function getSeoConfig() {
  try {
    const path = join(process.cwd(), "data", "site-config.json");
    if (existsSync(path)) {
      const data = JSON.parse(readFileSync(path, "utf-8"));
      return {
        description: data.seoDescription || "Premium matrimonial platform for the Lingayat community",
        keywords: data.seoKeywords || "Lingayat matrimony, Lingayat shaadi, Lingayat marriage",
      };
    }
  } catch {
    // ignore
  }
  return {
    description: "Premium matrimonial platform for the Lingayat community",
    keywords: "Lingayat matrimony, Lingayat shaadi, Lingayat marriage",
  };
}

const seo = getSeoConfig();
const siteUrl = getPublicSiteUrl();

export const metadata: Metadata = {
  title: "LingayatShaadi.in — Find your Lingayat match",
  description: seo.description,
  keywords: seo.keywords,
  authors: [{ name: "LingayatShaadi" }],
  creator: "LingayatShaadi",
  publisher: "LingayatShaadi",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteUrl,
    siteName: "LingayatShaadi.in",
    title: "LingayatShaadi.in — Find your Lingayat match",
    description: seo.description,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "LingayatShaadi — Lingayat matrimony",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LingayatShaadi.in — Find your Lingayat match",
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
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        <AuthProvider>
          <AppConfigProvider>
            <AuthModalProvider>
              {children}
              <ContactFloat />
              <ConfigInjector />
              <div id="lingayat-external-scripts" suppressHydrationWarning />
            </AuthModalProvider>
          </AppConfigProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
