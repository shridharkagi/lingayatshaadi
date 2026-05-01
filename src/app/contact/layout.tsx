import type { Metadata } from "next";
import { getPublicSiteUrl } from "@/lib/siteUrl";

const siteUrl = getPublicSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Contact Us | LingayatBandhu",
  description: "Email, phone, and WhatsApp support for LingayatBandhu — Lingayat matrimony help.",
  openGraph: {
    title: "Contact Us | LingayatBandhu",
    description: "Reach LingayatBandhu support by email, phone, or WhatsApp.",
    url: `${siteUrl}/contact`,
    siteName: "LingayatBandhu",
    images: [
      {
        url: "/og/lingayatbandhu-og.png",
        width: 1200,
        height: 630,
        alt: "LingayatBandhu Matrimony",
      },
    ],
  },
  twitter: {
    images: ["/og/lingayatbandhu-og.png"],
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
