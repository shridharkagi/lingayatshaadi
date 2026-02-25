import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppConfigProvider } from "@/contexts/AppConfigContext";
import { ContactFloat } from "@/components/ui/ContactFloat";

export const metadata: Metadata = {
  title: "LingayatShaadi - Find Your Perfect Match",
  description: "Premium matrimonial platform for the Lingayat community",
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
            {children}
            <ContactFloat />
          </AppConfigProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
