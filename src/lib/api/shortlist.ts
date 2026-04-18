import { createSupabaseClientSafe } from "@/lib/supabase";

/** Add profile to shortlist */
export async function addToShortlist(
  myProfileId: string,
  profileId: string
): Promise<{ error: string | null }> {
  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) return { error: "Supabase not configured" };

    const { error } = await supabase.from("shortlisted_profiles").upsert(
      { user_id: myProfileId, profile_id: profileId },
      { onConflict: "user_id,profile_id" }
    );

    return { error: error?.message ?? null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to add to shortlist",
    };
  }
}

/** Remove profile from shortlist */
export async function removeFromShortlist(
  myProfileId: string,
  profileId: string
): Promise<{ error: string | null }> {
  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) return { error: "Supabase not configured" };

    const { error } = await supabase
      .from("shortlisted_profiles")
      .delete()
      .eq("user_id", myProfileId)
      .eq("profile_id", profileId);

    return { error: error?.message ?? null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to remove from shortlist",
    };
  }
}

/** Get shortlisted profile ids for current user */
export async function getShortlistedIds(myProfileId: string): Promise<{
  data: string[];
  error: string | null;
}> {
  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) return { data: [], error: "Supabase not configured" };

    const { data, error } = await supabase
      .from("shortlisted_profiles")
      .select("profile_id")
      .eq("user_id", myProfileId)
      .order("created_at", { ascending: false });

    if (error) return { data: [], error: error.message };
    return {
      data: (data || []).map((r: { profile_id: string }) => r.profile_id),
      error: null,
    };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : "Failed to fetch shortlist",
    };
  }
}

/** Check if profile is shortlisted */
export async function isShortlisted(
  myProfileId: string,
  profileId: string
): Promise<{ data: boolean; error: string | null }> {
  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) return { data: false, error: "Supabase not configured" };

    const { data, error } = await supabase
      .from("shortlisted_profiles")
      .select("id")
      .eq("user_id", myProfileId)
      .eq("profile_id", profileId)
      .maybeSingle();

    if (error) return { data: false, error: error.message };
    return { data: !!data, error: null };
  } catch (err) {
    return {
      data: false,
      error: err instanceof Error ? err.message : "Failed to check shortlist",
    };
  }
}
