import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Work counts for the admin sidebar and Overview inbox. Items that belong to
 * deleted (trashed) profiles are excluded — the review queues hide them too,
 * so counting them left badges that could never be cleared.
 */
export async function getInboxCounts(admin: SupabaseClient) {
  const [profilesRes, photosRes, kycRes, upgradeRes, deletionRes] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("moderation_status", "pending_review").is("deleted_at", null),
    admin.from("profile_photos").select("profile_id").eq("status", "pending").limit(5000),
    admin.from("profile_kyc_documents").select("profile_id").eq("status", "pending").limit(5000),
    admin.from("subscription_upgrade_requests").select("status").in("status", ["new", "contacted"]).limit(5000),
    admin.from("profile_deletion_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  const photos = (photosRes.data || []) as { profile_id: string }[];
  const kyc = (kycRes.data || []) as { profile_id: string }[];
  const ids = [...new Set([...photos, ...kyc].map((r) => r.profile_id).filter(Boolean))];
  const live = new Set<string>();
  if (ids.length) {
    const { data } = await admin.from("profiles").select("id").in("id", ids).is("deleted_at", null);
    for (const r of (data || []) as { id: string }[]) live.add(r.id);
  }
  const livePhotos = photos.filter((p) => live.has(p.profile_id));
  const upgrades = (upgradeRes.data || []) as { status: string }[];
  return {
    pendingProfiles: profilesRes.count || 0,
    pendingPhotos: livePhotos.length,
    pendingPhotoProfiles: new Set(livePhotos.map((p) => p.profile_id)).size,
    pendingKyc: kyc.filter((k) => live.has(k.profile_id)).length,
    upgradeOpen: upgrades.length,
    upgradeNew: upgrades.filter((u) => u.status === "new").length,
    deletionRequests: deletionRes.count || 0,
  };
}
