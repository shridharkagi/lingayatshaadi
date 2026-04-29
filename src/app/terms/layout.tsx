import type { Metadata } from "next";
import { getPublicSiteUrl } from "@/lib/siteUrl";

const siteUrl = getPublicSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Terms of Use | LingayatBandhu",
  description:
    "Terms governing use of LingayatBandhu — eligibility, conduct, content, and liability for our Lingayat matrimony platform.",
  openGraph: {
    title: "Terms of Use | LingayatBandhu",
    description: "Terms of use for LingayatBandhu.",
    url: `${siteUrl}/terms`,
    siteName: "LingayatBandhu",
  },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
