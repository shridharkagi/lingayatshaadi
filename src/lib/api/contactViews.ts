import { createSupabaseClientSafe } from "@/lib/supabase";

/** Record that viewer viewed contact details of viewedProfile */
export async function recordContactView(
  viewerProfileId: string,
  viewedProfileId: string
): Promise<{ error: string | null }> {
  if (viewerProfileId === viewedProfileId) return { error: null };

  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) return { error: "Supabase not configured" };

    await supabase.from("contact_views").upsert(
      { viewer_id: viewerProfileId, viewed_id: viewedProfileId, viewed_at: new Date().toISOString() },
      { onConflict: "viewer_id,viewed_id" }
    );

    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to record contact view",
    };
  }
}

export interface ContactViewRecord {
  viewedId: string;
  viewedAt: string;
}

/** Get contacts I've viewed (viewer_id = my profile) */
export async function getContactViews(myProfileId: string): Promise<{
  data: ContactViewRecord[];
  error: string | null;
}> {
  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) return { data: [], error: "Supabase not configured" };

    const { data, error } = await supabase
      .from("contact_views")
      .select("viewed_id, viewed_at")
      .eq("viewer_id", myProfileId)
      .order("viewed_at", { ascending: false })
      .limit(100);

    if (error) return { data: [], error: error.message };
    return {
      data: (data || []).map((r: { viewed_id: string; viewed_at: string }) => ({
        viewedId: r.viewed_id,
        viewedAt: r.viewed_at,
      })),
      error: null,
    };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : "Failed to fetch contact views",
    };
  }
}

/** Remove a contact from viewed list */
export async function removeContactView(
  myProfileId: string,
  viewedProfileId: string
): Promise<{ error: string | null }> {
  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) return { error: "Supabase not configured" };

    const { error } = await supabase
      .from("contact_views")
      .delete()
      .eq("viewer_id", myProfileId)
      .eq("viewed_id", viewedProfileId);

    return { error: error?.message ?? null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to remove contact view",
    };
  }
}

/** Clear all contact views for user */
export async function clearContactViews(myProfileId: string): Promise<{ error: string | null }> {
  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) return { error: "Supabase not configured" };

    const { error } = await supabase
      .from("contact_views")
      .delete()
      .eq("viewer_id", myProfileId);

    return { error: error?.message ?? null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to clear contact views",
    };
  }
}
