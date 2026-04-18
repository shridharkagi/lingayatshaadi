import { createSupabaseClientSafe } from "@/lib/supabase";

/** Record that viewerId viewed profileId's profile */
export async function recordProfileView(
  viewerProfileId: string,
  viewedProfileId: string
): Promise<{ error: string | null }> {
  if (viewerProfileId === viewedProfileId) return { error: null };

  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) return { error: "Supabase not configured" };

    await supabase.from("profile_views").insert({
      viewer_id: viewerProfileId,
      viewed_id: viewedProfileId,
    });

    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to record view",
    };
  }
}

export interface ProfileViewRecord {
  id: string;
  viewerId: string;
  viewedAt: string;
}

/** Get who viewed my profile (viewed_id = my profile id) */
export async function getProfileViews(myProfileId: string): Promise<{
  data: ProfileViewRecord[];
  error: string | null;
}> {
  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) return { data: [], error: "Supabase not configured" };

    const { data, error } = await supabase
      .from("profile_views")
      .select("id, viewer_id, viewed_at")
      .eq("viewed_id", myProfileId)
      .order("viewed_at", { ascending: false })
      .limit(50);

    if (error) return { data: [], error: error.message };
    return {
      data: (data || []).map((r: { id: string; viewer_id: string; viewed_at: string }) => ({
        id: r.id,
        viewerId: r.viewer_id,
        viewedAt: r.viewed_at,
      })),
      error: null,
    };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : "Failed to fetch profile views",
    };
  }
}
