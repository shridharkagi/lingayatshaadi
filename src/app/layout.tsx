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
