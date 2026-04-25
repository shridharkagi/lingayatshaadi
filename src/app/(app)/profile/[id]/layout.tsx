import type { Metadata } from "next";
import { fetchProfileForSeo } from "@/lib/server/fetchProfileForSeo";
import { getPublicSiteUrl, absolutePublicAssetUrl } from "@/lib/siteUrl";
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
      title: `Profile — LingayatShaadi.in`,
      description: "Find your life partner in the Lingayat community on LingayatShaadi.in.",
      openGraph: {
        type: "website",
        url: `${siteUrl}${profilePath}`,
        title: "Profile — LingayatShaadi.in",
        description: "Lingayat matrimony profiles with privacy-first discovery.",
        siteName: "LingayatShaadi.in",
        images: [{ url: defaultOg, width: 1200, height: 630, alt: "LingayatShaadi" }],
      },
      twitter: {
        card: "summary_large_image",
        title: "Profile — LingayatShaadi.in",
        description: "Lingayat matrimony on LingayatShaadi.in",
        images: [defaultOg],
      },
    };
  }

  const title = buildProfileSeoTitle(profile);
  const description = buildProfileSeoDescription(profile);
  const canonicalPath = `/profile/${getProfileSlug(profile)}`;
  const profileUrl = `${siteUrl}${canonicalPath}`;
  const imageUrl = profile.profilePhoto
    ? absolutePublicAssetUrl(siteUrl, profile.profilePhoto)
    : defaultOg;

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
      siteName: "LingayatShaadi.in",
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
