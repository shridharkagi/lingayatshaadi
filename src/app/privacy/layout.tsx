import type { Metadata } from "next";
import { getPublicSiteUrl } from "@/lib/siteUrl";

const siteUrl = getPublicSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Privacy Policy | LingayatBandhu",
  description:
    "How LingayatBandhu collects, uses, and protects your data for Lingayat matrimony. Contact us for privacy questions.",
  openGraph: {
    title: "Privacy Policy | LingayatBandhu",
    description: "Privacy practices for LingayatBandhu matrimonial profiles.",
    url: `${siteUrl}/privacy`,
    siteName: "LingayatBandhu",
  },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
