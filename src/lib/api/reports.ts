import { createSupabaseClientSafe } from "@/lib/supabase";

/** Report a profile */
export async function reportProfile(
  reporterProfileId: string,
  reportedProfileId: string,
  reason: string,
  message?: string
): Promise<{ error: string | null }> {
  if (reporterProfileId === reportedProfileId) return { error: "Cannot report yourself" };

  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) return { error: "Supabase not configured" };

    const { error } = await supabase.from("reports").insert({
      reporter_id: reporterProfileId,
      reported_id: reportedProfileId,
      reason: reason.trim(),
      message: message?.trim() || null,
    });

    return { error: error?.message ?? null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to submit report",
    };
  }
}
