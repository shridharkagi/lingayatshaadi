import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";
import { logAdminAudit } from "@/lib/server/adminAudit";

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = (await req.json()) as {
      photoId?: string;
      action?: "approve" | "reject";
      reason?: string;
    };
    if (!body.photoId || !body.action) {
      return NextResponse.json({ error: "photoId and action are required" }, { status: 400 });
    }

    const admin = createSupabaseAdmin();
    const { data: current, error: fetchError } = await admin
      .from("profile_photos")
      .select("*")
      .eq("id", body.photoId)
      .maybeSingle();
    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
    if (!current) return NextResponse.json({ error: "Photo not found" }, { status: 404 });

    const now = new Date().toISOString();
    const nextStatus = body.action === "approve" ? "approved" : "rejected";
    const { error } = await admin
      .from("profile_photos")
      .update({
        status: nextStatus,
        rejection_reason: nextStatus === "rejected" ? body.reason || null : null,
        reviewed_at: now,
        reviewed_by: auth.userId,
      })
      .eq("id", body.photoId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await logAdminAudit({
      actorUserId: auth.userId,
      action: body.action === "approve" ? "photo.approve" : "photo.reject",
      entityType: "profile_photo",
      entityId: body.photoId,
      beforeJson: current as Record<string, unknown>,
      afterJson: {
        status: nextStatus,
        rejection_reason: nextStatus === "rejected" ? body.reason || null : null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
