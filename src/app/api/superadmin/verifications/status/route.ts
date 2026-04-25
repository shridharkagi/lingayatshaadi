import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";
import { logAdminAudit } from "@/lib/server/adminAudit";

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await req.json()) as { profileId?: string; verified?: boolean };
  if (!body.profileId || typeof body.verified !== "boolean") {
    return NextResponse.json({ error: "profileId and verified are required" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const { data: before } = await admin.from("profiles").select("*").eq("id", body.profileId).maybeSingle();
  const { error } = await admin
    .from("profiles")
    .update({
      verified: body.verified,
      profile_status: body.verified ? "verified" : "pending",
      reviewed_by: auth.userId,
    })
    .eq("id", body.profileId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAudit({
    actorUserId: auth.userId,
    action: body.verified ? "profile.approve" : "profile.reject",
    entityType: "profile",
    entityId: body.profileId,
    beforeJson: (before as Record<string, unknown>) || null,
    afterJson: { verified: body.verified },
  });
  return NextResponse.json({ ok: true });
}
