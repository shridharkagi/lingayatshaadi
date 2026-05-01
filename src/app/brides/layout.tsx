import type { Metadata } from "next";
import { ProfilesClientProvider } from "@/components/providers/ProfilesClientProvider";

export const metadata: Metadata = {
  openGraph: {
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

export default function BridesLayout({ children }: { children: React.ReactNode }) {
  return <ProfilesClientProvider>{children}</ProfilesClientProvider>;
}
