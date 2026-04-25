import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";
import { logAdminAudit } from "@/lib/server/adminAudit";
import { moveProfileToTrash } from "@/lib/server/moveProfileToTrash";

type LifecycleAction =
  | "suspend"
  | "unsuspend"
  | "to_draft"
  | "trash"
  | "restore"
  | "purge"
  | "block"
  | "unblock";

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = (await req.json()) as {
      profileId?: string;
      action?: LifecycleAction;
      reason?: string;
      note?: string;
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

    const reason = (body.reason || "").trim();
    const now = new Date().toISOString();

    if (body.action === "suspend" || body.action === "unsuspend" || body.action === "to_draft") {
      const nextStatus =
        body.action === "suspend" ? "suspended" : body.action === "to_draft" ? "pending" : "verified";
      const nextModeration = body.action === "to_draft" ? "draft" : null;
      const nextVerified = body.action === "to_draft" ? false : undefined;
      const { error } = await admin
        .from("profiles")
        .update({
          profile_status: nextStatus,
          ...(nextModeration ? { moderation_status: nextModeration } : {}),
          ...(typeof nextVerified === "boolean" ? { verified: nextVerified } : {}),
        })
        .eq("id", body.profileId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await logAdminAudit({
        actorUserId: auth.userId,
        action:
          body.action === "suspend"
            ? "profile.suspend"
            : body.action === "to_draft"
            ? "profile.move_to_draft"
            : "profile.unsuspend",
        entityType: "profile",
        entityId: body.profileId,
        beforeJson: row as Record<string, unknown>,
        afterJson: { profile_status: nextStatus, ...(nextModeration ? { moderation_status: nextModeration } : {}) },
      });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "block" || body.action === "unblock") {
      const isBlocked = body.action === "block";
      const { error } = await admin
        .from("profiles")
        .update({
          is_blocked: isBlocked,
          blocked_reason: isBlocked ? reason || null : null,
          blocked_at: isBlocked ? now : null,
          blocked_by: isBlocked ? auth.userId : null,
        })
        .eq("id", body.profileId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "trash") {
      if (!reason) {
        return NextResponse.json({ error: "reason is required for trash action" }, { status: 400 });
      }
      const moved = await moveProfileToTrash(admin, {
        profileId: body.profileId,
        actorUserId: auth.userId,
        reason,
        note: body.note || null,
      });
      if (!moved.ok) return NextResponse.json({ error: moved.error }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "restore") {
      await admin
        .from("profile_trash")
        .update({ restored_at: now, restored_by: auth.userId })
        .eq("profile_id", body.profileId)
        .is("restored_at", null);
      const { error } = await admin
        .from("profiles")
        .update({
          deleted_at: null,
          deleted_reason: null,
          deleted_note: null,
          deleted_by: null,
          profile_status: "verified",
        })
        .eq("id", body.profileId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await logAdminAudit({
        actorUserId: auth.userId,
        action: "profile.restore",
        entityType: "profile",
        entityId: body.profileId,
        beforeJson: row as Record<string, unknown>,
        afterJson: { deleted_at: null },
      });
      return NextResponse.json({ ok: true });
    }

    await admin
      .from("profile_trash")
      .update({ is_purged: true, purged_at: now })
      .eq("profile_id", body.profileId)
      .is("is_purged", false);
    const { error } = await admin.from("profiles").delete().eq("id", body.profileId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logAdminAudit({
      actorUserId: auth.userId,
      action: "profile.purge",
      entityType: "profile",
      entityId: body.profileId,
      beforeJson: row as Record<string, unknown>,
      afterJson: { purged: true },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
