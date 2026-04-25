import type { SupabaseClient } from "@supabase/supabase-js";
import { logAdminAudit } from "@/lib/server/adminAudit";

type ProfileRow = Record<string, unknown>;

/**
 * Soft-delete a profile into profile_trash + mark profiles row (same as superadmin lifecycle "trash").
 */
export async function moveProfileToTrash(
  admin: SupabaseClient,
  opts: {
    profileId: string;
    actorUserId: string;
    reason: string;
    note?: string | null;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { profileId, actorUserId, reason, note } = opts;
  const trimmed = reason.trim();
  if (!trimmed) return { ok: false, error: "reason is required" };

  const { data: row, error: fetchError } = await admin.from("profiles").select("*").eq("id", profileId).maybeSingle();
  if (fetchError) return { ok: false, error: fetchError.message };
  if (!row) return { ok: false, error: "Profile not found" };

  const now = new Date().toISOString();
  const trashPayload = {
    profile_id: profileId,
    public_id: (row as { public_id?: string }).public_id || null,
    full_name: (row as { full_name?: string }).full_name || null,
    deleted_reason: trimmed,
    deleted_note: note || null,
    deleted_by: actorUserId,
    deleted_at: now,
    payload: row,
    restored_at: null,
    restored_by: null,
    is_purged: false,
    purged_at: null,
  };

  const { data: activeTrash, error: activeTrashErr } = await admin
    .from("profile_trash")
    .select("id")
    .eq("profile_id", profileId)
    .is("restored_at", null)
    .eq("is_purged", false)
    .maybeSingle();
  if (activeTrashErr) return { ok: false, error: activeTrashErr.message };
  if (activeTrash?.id) {
    const { error: trashUpdateErr } = await admin.from("profile_trash").update(trashPayload).eq("id", activeTrash.id);
    if (trashUpdateErr) return { ok: false, error: trashUpdateErr.message };
  } else {
    const { error: trashInsertErr } = await admin.from("profile_trash").insert(trashPayload);
    if (trashInsertErr) return { ok: false, error: trashInsertErr.message };
  }

  const { error } = await admin
    .from("profiles")
    .update({
      deleted_at: now,
      deleted_reason: trimmed,
      deleted_note: note || null,
      deleted_by: actorUserId,
      profile_status: "rejected",
    })
    .eq("id", profileId);
  if (error) return { ok: false, error: error.message };

  await logAdminAudit({
    actorUserId,
    action: "profile.trash",
    entityType: "profile",
    entityId: profileId,
    beforeJson: row as ProfileRow,
    afterJson: { deleted_at: now, deleted_reason: trimmed, deleted_note: note || null },
  });
  return { ok: true };
}
