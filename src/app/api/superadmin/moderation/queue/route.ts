import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";

/**
 * Moderation queue for the superadmin console: pending profiles (with their
 * approved snapshot for diffing), pending photos, and tile counts.
 * Served via service role because `profiles` is no longer world-readable.
 */
export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createSupabaseAdmin();
  const [profiles, photos, rejected] = await Promise.all([
    admin
      .from("profiles")
      .select("*")
      .eq("moderation_status", "pending_review")
      .is("deleted_at", null)
      .order("last_submitted_at", { ascending: false }),
    admin
      .from("profile_photos")
      .select("*")
      .eq("status", "pending")
      .order("uploaded_at", { ascending: true }),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("moderation_status", "rejected")
      .is("deleted_at", null),
  ]);

  const error = profiles.error?.message || photos.error?.message || rejected.error?.message;
  if (error) return NextResponse.json({ error }, { status: 500 });

  return NextResponse.json({
    profiles: profiles.data || [],
    photos: photos.data || [],
    counts: {
      pendingProfiles: (profiles.data || []).length,
      pendingPhotos: (photos.data || []).length,
      rejectedProfiles: rejected.count ?? 0,
    },
  });
}
