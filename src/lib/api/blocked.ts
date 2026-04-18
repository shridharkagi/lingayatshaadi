import { createSupabaseClientSafe } from "@/lib/supabase";

/** Block a user */
export async function blockUser(
  myProfileId: string,
  profileId: string
): Promise<{ error: string | null }> {
  if (myProfileId === profileId) return { error: "Cannot block yourself" };

  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) return { error: "Supabase not configured" };

    const { error } = await supabase.from("blocked_users").upsert(
      { blocker_id: myProfileId, blocked_id: profileId },
      { onConflict: "blocker_id,blocked_id" }
    );

    return { error: error?.message ?? null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to block user",
    };
  }
}

/** Unblock a user */
export async function unblockUser(
  myProfileId: string,
  profileId: string
): Promise<{ error: string | null }> {
  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) return { error: "Supabase not configured" };

    const { error } = await supabase
      .from("blocked_users")
      .delete()
      .eq("blocker_id", myProfileId)
      .eq("blocked_id", profileId);

    return { error: error?.message ?? null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to unblock user",
    };
  }
}

/** Get blocked profile ids */
export async function getBlockedIds(myProfileId: string): Promise<{
  data: string[];
  error: string | null;
}> {
  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) return { data: [], error: "Supabase not configured" };

    const { data, error } = await supabase
      .from("blocked_users")
      .select("blocked_id")
      .eq("blocker_id", myProfileId);

    if (error) return { data: [], error: error.message };
    return {
      data: (data || []).map((r: { blocked_id: string }) => r.blocked_id),
      error: null,
    };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : "Failed to fetch blocked users",
    };
  }
}

/** Check if profile is blocked */
export async function isBlocked(
  myProfileId: string,
  profileId: string
): Promise<{ data: boolean; error: string | null }> {
  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) return { data: false, error: "Supabase not configured" };

    const { data, error } = await supabase
      .from("blocked_users")
      .select("id")
      .eq("blocker_id", myProfileId)
      .eq("blocked_id", profileId)
      .maybeSingle();

    if (error) return { data: false, error: error.message };
    return { data: !!data, error: null };
  } catch (err) {
    return {
      data: false,
      error: err instanceof Error ? err.message : "Failed to check blocked status",
    };
  }
}
