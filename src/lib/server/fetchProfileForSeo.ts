import { createSupabaseClientSafe, createSupabaseAdmin } from "@/lib/supabase";
import { parseProfileSlug } from "@/lib/memberId";
import { profileForPublic } from "@/lib/api/profiles";
import type { ProfileRow } from "@/lib/profileMapper";
import type { Profile } from "@/types";

/**
 * Server-only fetch for SEO / Open Graph. Prefers service role so RLS does
 * not block public crawlers; falls back to anon when the service key is absent.
 */
export async function fetchProfileForSeo(routeSlug: string): Promise<Profile | null> {
  const publicId = parseProfileSlug(routeSlug);
  if (!publicId) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const client =
    url && serviceKey ? createSupabaseAdmin() : createSupabaseClientSafe();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from("profiles")
      .select("*")
      .or(`public_id.eq.${publicId},member_id.eq.${publicId}`)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !data) return null;
    return profileForPublic(data as ProfileRow);
  } catch {
    return null;
  }
}
