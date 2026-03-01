import { Metadata } from "next";
import { createSupabaseClient } from "@/lib/supabase";
import { parseProfileSlug } from "@/lib/memberId";
import { getAge } from "@/lib/utils";

type Props = {
  params: { id: string };
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const publicId = parseProfileSlug(params.id);
  const supabase = createSupabaseClient();
  
  let profile = null;
  if (publicId) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .or(`public_id.eq.${publicId},member_id.eq.${publicId}`)
      .single();
    profile = data;
  }

  if (!profile) {
    return {
      title: "Profile - LingayatShaadi",
      description: "View profile on LingayatShaadi",
    };
  }

  const age = profile.date_of_birth ? getAge(profile.date_of_birth) : "N/A";
  const title = `${profile.full_name || "Profile"} - ${age} yrs, ${profile.profession || "Profession"} | LingayatShaadi`;
  const description = `${profile.full_name || "Profile"} - ${age} years old, ${profile.height || "N/A"}" tall, ${profile.profession || "Profession"} from ${profile.city || "City"}, ${profile.state || "State"}. ${profile.qualification || "Education"}. Find your perfect match on LingayatShaadi.`;

  const profileUrl = `https://test.ligayatshaadi.in/profile/${params.id}`;

  return {
    title,
    description,
    openGraph: {
      type: "profile",
      url: profileUrl,
      title,
      description,
      images: [
        {
          url: profile.profile_photo || "/og-image.png",
          width: 1200,
          height: 630,
          alt: `${profile.full_name || "Profile"} - LingayatShaadi`,
        },
      ],
      siteName: "LingayatShaadi",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [profile.profile_photo || "/og-image.png"],
    },
  };
}

export default function ProfileLayout({ children }: Props) {
  return <>{children}</>;
}
