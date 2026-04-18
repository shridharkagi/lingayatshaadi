import { createSupabaseClientSafe } from "@/lib/supabase";

export interface ProfileNote {
  id: string;
  profileId: string;
  note: string;
  updatedAt: string;
}

/** Save or update a note for a profile */
export async function saveNote(
  myProfileId: string,
  profileId: string,
  note: string
): Promise<{ error: string | null }> {
  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) return { error: "Supabase not configured" };

    const { error } = await supabase.from("profile_notes").upsert(
      { user_id: myProfileId, profile_id: profileId, note: note.trim(), updated_at: new Date().toISOString() },
      { onConflict: "user_id,profile_id" }
    );

    return { error: error?.message ?? null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to save note",
    };
  }
}

/** Get all notes for current user */
export async function getNotes(myProfileId: string): Promise<{
  data: ProfileNote[];
  error: string | null;
}> {
  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) return { data: [], error: "Supabase not configured" };

    const { data, error } = await supabase
      .from("profile_notes")
      .select("id, profile_id, note, updated_at")
      .eq("user_id", myProfileId)
      .order("updated_at", { ascending: false });

    if (error) return { data: [], error: error.message };
    return {
      data: (data || []).map((r: { id: string; profile_id: string; note: string; updated_at: string }) => ({
        id: r.id,
        profileId: r.profile_id,
        note: r.note,
        updatedAt: r.updated_at,
      })),
      error: null,
    };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : "Failed to fetch notes",
    };
  }
}

/** Get note for a specific profile */
export async function getNote(
  myProfileId: string,
  profileId: string
): Promise<{ data: string | null; error: string | null }> {
  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) return { data: null, error: "Supabase not configured" };

    const { data, error } = await supabase
      .from("profile_notes")
      .select("note")
      .eq("user_id", myProfileId)
      .eq("profile_id", profileId)
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    return { data: data?.note ?? null, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to fetch note",
    };
  }
}
