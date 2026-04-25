import type { Metadata } from "next";
import { getPublicSiteUrl } from "@/lib/siteUrl";

const siteUrl = getPublicSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Terms of Use | LingayatShaadi.in",
  description:
    "Terms governing use of LingayatShaadi.in — eligibility, conduct, content, and liability for our Lingayat matrimony platform.",
  openGraph: {
    title: "Terms of Use | LingayatShaadi.in",
    description: "Terms of use for LingayatShaadi.in.",
    url: `${siteUrl}/terms`,
    siteName: "LingayatShaadi.in",
  },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
