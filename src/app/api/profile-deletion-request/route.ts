import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireAuthUser } from "@/lib/server/requireAuthUser";

const MIN_REASON = 15;

/** List this user's pending deletion requests (profile ids). */
export async function GET(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("profile_deletion_requests")
    .select("id, profile_id, reason, created_at")
    .eq("user_id", auth.userId)
    .eq("status", "pending");

  if (error) {
    if (/relation|does not exist/i.test(error.message)) {
      return NextResponse.json({ pending: [], warning: "Deletion requests table not installed" });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ pending: data || [] });
}

/** Submit a profile deletion request for admin review. */
export async function POST(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: { profileId?: string; reason?: string };
  try {
    body = (await req.json()) as { profileId?: string; reason?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const profileId = typeof body.profileId === "string" ? body.profileId.trim() : "";
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!profileId) return NextResponse.json({ error: "profileId is required" }, { status: 400 });
  if (reason.length < MIN_REASON) {
    return NextResponse.json(
      { error: `Please provide a reason (at least ${MIN_REASON} characters).` },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdmin();
  const { data: profile, error: pErr } = await admin
    .from("profiles")
    .select("id, user_id, full_name, deleted_at")
    .eq("id", profileId)
    .maybeSingle();
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  if (String((profile as { user_id?: string }).user_id) !== auth.userId) {
    return NextResponse.json({ error: "You can only request deletion for your own profiles" }, { status: 403 });
  }
  if ((profile as { deleted_at?: string | null }).deleted_at) {
    return NextResponse.json({ error: "This profile is already removed" }, { status: 400 });
  }

  const { error: insErr } = await admin.from("profile_deletion_requests").insert({
    profile_id: profileId,
    user_id: auth.userId,
    reason,
    status: "pending",
  });
  if (insErr) {
    if (/relation|does not exist/i.test(insErr.message)) {
      return NextResponse.json(
        { error: "Deletion requests are not configured. Ask support to run the database migration." },
        { status: 503 }
      );
    }
    if (/unique|duplicate/i.test(insErr.message)) {
      return NextResponse.json(
        { error: "A deletion request for this profile is already pending review." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
