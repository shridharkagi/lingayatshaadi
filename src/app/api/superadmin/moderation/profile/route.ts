import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";
import { logAdminAudit } from "@/lib/server/adminAudit";
import { generatePublicIdFromExistingIds } from "@/lib/memberId";

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = (await req.json()) as {
      profileId?: string;
      action?: "approve" | "reject";
      reason?: string;
    };
    if (!body.profileId || !body.action) {
      return NextResponse.json({ error: "profileId and action are required" }, { status: 400 });
    }

    const admin = createSupabaseAdmin();
    const { data: row, error: fetchError } = await admin
      .from("profiles")
      .select("*")
      .eq("id", body.profileId)
      .maybeSingle();
    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
    if (!row) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    if (body.action === "approve") {
      const snapshot = { ...(row as Record<string, unknown>) };
      delete snapshot.approved_snapshot;
      const now = new Date().toISOString();
      let publicId = (row as { public_id?: string | null }).public_id || null;
      if (!publicId) {
        const { data: existing } = await admin.from("profiles").select("public_id").like("public_id", "L%");
        const ids = (existing || [])
          .map((r) => (r as { public_id?: string | null }).public_id || "")
          .filter(Boolean);
        publicId = generatePublicIdFromExistingIds(
          ids,
          ((row as { gender?: string }).gender as "male" | "female" | undefined) || "male"
        );
      }
      const { error: updateError } = await admin
        .from("profiles")
        .update({
          public_id: publicId,
          moderation_status: "approved",
          verified: true,
          profile_status: "verified",
          approved_snapshot: snapshot,
          approved_at: now,
          rejection_reason: null,
          reviewed_by: auth.userId,
        })
        .eq("id", body.profileId);
      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

      await admin
        .from("profile_photos")
        .update({ status: "approved", reviewed_at: now, reviewed_by: auth.userId })
        .eq("profile_id", body.profileId)
        .eq("status", "pending");

      await logAdminAudit({
        actorUserId: auth.userId,
        action: "profile.approve",
        entityType: "profile",
        entityId: body.profileId,
        beforeJson: row as Record<string, unknown>,
        afterJson: { moderation_status: "approved" },
      });
      return NextResponse.json({ ok: true });
    }

    const reason = (body.reason || "").trim();
    if (!reason) return NextResponse.json({ error: "reason is required" }, { status: 400 });
    const { error: rejectError } = await admin
      .from("profiles")
      .update({
        moderation_status: "rejected",
        rejection_reason: reason,
        reviewed_by: auth.userId,
      })
      .eq("id", body.profileId);
    if (rejectError) return NextResponse.json({ error: rejectError.message }, { status: 500 });

    await logAdminAudit({
      actorUserId: auth.userId,
      action: "profile.reject",
      entityType: "profile",
      entityId: body.profileId,
      beforeJson: row as Record<string, unknown>,
      afterJson: { moderation_status: "rejected", rejection_reason: reason },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
