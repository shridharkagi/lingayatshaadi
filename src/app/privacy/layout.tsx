import type { Metadata } from "next";
import { getPublicSiteUrl } from "@/lib/siteUrl";

const siteUrl = getPublicSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Privacy Policy | LingayatShaadi.in",
  description:
    "How LingayatShaadi.in collects, uses, and protects your data for Lingayat matrimony. Contact us for privacy questions.",
  openGraph: {
    title: "Privacy Policy | LingayatShaadi.in",
    description: "Privacy practices for LingayatShaadi.in matrimonial profiles.",
    url: `${siteUrl}/privacy`,
    siteName: "LingayatShaadi.in",
  },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
