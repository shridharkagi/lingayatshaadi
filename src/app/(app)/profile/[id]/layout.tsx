import { Metadata } from "next";
import { createSupabaseClient } from "@/lib/supabase";
import { parseProfileSlug } from "@/lib/memberId";
import { getAge } from "@/lib/utils";

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  
  // Check if Supabase is configured before attempting connection
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  let profile = null;
  
  // Only attempt Supabase query if credentials are configured
  if (supabaseUrl && supabaseKey) {
    try {
      const publicId = parseProfileSlug(id);
      const supabase = createSupabaseClient();
      
      if (publicId) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .or(`public_id.eq.${publicId},member_id.eq.${publicId}`)
          .single();
        profile = data;
      }
    } catch (error) {
      console.log("Supabase not configured, using default metadata");
    }
  }

  // Return default metadata when Supabase isn't connected or profile not found
  if (!profile) {
    return {
      title: `Profile ${id} - LingayatShaadi`,
      description: "Find your perfect life partner in the Lingayat community. View detailed profiles with verified information.",
      openGraph: {
        type: "profile",
        url: `https://test.ligayatshaadi.in/profile/${id}`,
        title: "Profile - LingayatShaadi",
        description: "Find your perfect life partner in the Lingayat community.",
        siteName: "LingayatShaadi",
      },
    };
  }

  // If we have profile data from Supabase, generate rich metadata
  const age = profile.date_of_birth ? getAge(profile.date_of_birth) : "N/A";
  const title = `${profile.full_name || "Profile"} - ${age} yrs, ${profile.profession || "Profession"} | LingayatShaadi`;
  const description = `${profile.full_name || "Profile"} - ${age} years old, ${profile.height || "N/A"}" tall, ${profile.profession || "Profession"} from ${profile.city || "City"}, ${profile.state || "State"}. ${profile.qualification || "Education"}. Find your perfect match on LingayatShaadi.`;

  const profileUrl = `https://test.ligayatshaadi.in/profile/${id}`;

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
