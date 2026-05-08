import type { Metadata } from "next";
import { fetchProfileForSeo } from "@/lib/server/fetchProfileForSeo";
import { getPublicSiteUrl } from "@/lib/siteUrl";
import { buildProfileSeoDescription, buildProfileSeoTitle } from "@/lib/profileSeo";
import { getProfileSlug } from "@/lib/memberId";

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const siteUrl = getPublicSiteUrl();
  const defaultOg = `${siteUrl}/opengraph-image`;
  const profilePath = `/profile/${id}`;

  const profile = await fetchProfileForSeo(id);

  if (!profile) {
    return {
      metadataBase: new URL(siteUrl),
      title: `Profile — LingayatBandhu`,
      description: "Find your life partner in the Lingayat community on LingayatBandhu.",
      openGraph: {
        type: "website",
        url: `${siteUrl}${profilePath}`,
        title: "Profile — LingayatBandhu",
        description: "Lingayat matrimony profiles with privacy-first discovery.",
        siteName: "LingayatBandhu",
        images: [{ url: defaultOg, width: 1200, height: 630, alt: "LingayatBandhu" }],
      },
      twitter: {
        card: "summary_large_image",
        title: "Profile — LingayatBandhu",
        description: "Lingayat matrimony on LingayatBandhu",
        images: [defaultOg],
      },
    };
  }

  const title = buildProfileSeoTitle(profile);
  const description = buildProfileSeoDescription(profile);
  const canonicalPath = `/profile/${getProfileSlug(profile)}`;
  const profileUrl = `${siteUrl}${canonicalPath}`;
  const imageUrl = `${siteUrl}${canonicalPath}/opengraph-image`;

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: { canonical: profileUrl },
    openGraph: {
      type: "profile",
      url: profileUrl,
      title,
      description,
      siteName: "LingayatBandhu",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function ProfileLayout({ children }: Props) {
  return <>{children}</>;
}
