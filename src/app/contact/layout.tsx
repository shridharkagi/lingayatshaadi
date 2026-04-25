import type { Metadata } from "next";
import { getPublicSiteUrl } from "@/lib/siteUrl";

const siteUrl = getPublicSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Contact Us | LingayatShaadi.in",
  description: "Email, phone, and WhatsApp support for LingayatShaadi.in — Lingayat matrimony help.",
  openGraph: {
    title: "Contact Us | LingayatShaadi.in",
    description: "Reach LingayatShaadi.in support by email, phone, or WhatsApp.",
    url: `${siteUrl}/contact`,
    siteName: "LingayatShaadi.in",
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
