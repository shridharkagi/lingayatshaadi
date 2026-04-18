import type { Metadata } from "next";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppConfigProvider } from "@/contexts/AppConfigContext";
import { ProfilesProvider } from "@/contexts/ProfilesContext";
import { ContactFloat } from "@/components/ui/ContactFloat";
import { ConfigInjector } from "@/components/ConfigInjector";
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

export const metadata: Metadata = {
  title: "LingayatShaadi - Find Your Perfect Match",
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
    locale: "en_US",
    url: "https://test.ligayatshaadi.in",
    siteName: "LingayatShaadi",
    title: "LingayatShaadi - Find Your Perfect Match",
    description: seo.description,
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "LingayatShaadi - Premium Matrimonial Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LingayatShaadi - Find Your Perfect Match",
    description: seo.description,
    images: ["/og-image.jpg"],
  },
  metadataBase: new URL("https://test.ligayatshaadi.in"),
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  },
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        <AuthProvider>
          <ProfilesProvider>
            <AppConfigProvider>
              {children}
              <ContactFloat />
              <ConfigInjector />
              <div id="lingayat-external-scripts" suppressHydrationWarning />
            </AppConfigProvider>
          </ProfilesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
