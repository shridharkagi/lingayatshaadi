import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";
import { logAdminAudit } from "@/lib/server/adminAudit";
import { moveProfileToTrash } from "@/lib/server/moveProfileToTrash";

type Row = {
  id: string;
  profile_id: string;
  user_id: string;
  reason: string;
  status: string;
  created_at: string;
  resolved_at?: string | null;
  resolved_by?: string | null;
  admin_note?: string | null;
};

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("profile_deletion_requests")
    .select("id, profile_id, user_id, reason, status, created_at, resolved_at, resolved_by, admin_note")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    if (/relation|does not exist/i.test(error.message)) {
      return NextResponse.json({ requests: [], warning: "Table profile_deletion_requests not found" });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data || []) as Row[];
  const profileIds = [...new Set(rows.map((r) => r.profile_id))];
  const profileMeta = new Map<string, { full_name: string | null; public_id: string | null }>();
  if (profileIds.length > 0) {
    const { data: profs } = await admin.from("profiles").select("id, full_name, public_id").in("id", profileIds);
    for (const p of profs || []) {
      const row = p as { id: string; full_name?: string | null; public_id?: string | null };
      profileMeta.set(row.id, {
        full_name: row.full_name ?? null,
        public_id: row.public_id ?? null,
      });
    }
  }

  return NextResponse.json({
    requests: rows.map((r) => {
      const meta = profileMeta.get(r.profile_id);
      return {
        ...r,
        profile_name: meta?.full_name ?? null,
        profile_public_id: meta?.public_id ?? null,
      };
    }),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await req.json()) as {
    requestId?: string;
    action?: "approve" | "reject";
    adminNote?: string | null;
  };
  if (!body.requestId || !body.action) {
    return NextResponse.json({ error: "requestId and action are required" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const { data: reqRow, error: fetchErr } = await admin
    .from("profile_deletion_requests")
    .select("*")
    .eq("id", body.requestId)
    .maybeSingle();
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!reqRow) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (String((reqRow as Row).status) !== "pending") {
    return NextResponse.json({ error: "Request is no longer pending" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const profileId = String((reqRow as Row).profile_id);
  const userReason = String((reqRow as Row).reason || "").trim();

  if (body.action === "reject") {
    const { error } = await admin
      .from("profile_deletion_requests")
      .update({
        status: "rejected",
        resolved_at: now,
        resolved_by: auth.userId,
        admin_note: (body.adminNote || "").trim() || null,
      })
      .eq("id", body.requestId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logAdminAudit({
      actorUserId: auth.userId,
      action: "profile_deletion_request.reject",
      entityType: "profile_deletion_request",
      entityId: body.requestId,
      beforeJson: reqRow as Record<string, unknown>,
      afterJson: { status: "rejected" },
    });
    return NextResponse.json({ ok: true });
  }

  const moved = await moveProfileToTrash(admin, {
    profileId,
    actorUserId: auth.userId,
    reason: `User request: ${userReason}`,
    note: `Approved deletion request ${body.requestId}`,
  });
  if (!moved.ok) return NextResponse.json({ error: moved.error }, { status: 500 });

  const { error: updErr } = await admin
    .from("profile_deletion_requests")
    .update({
      status: "approved",
      resolved_at: now,
      resolved_by: auth.userId,
      admin_note: (body.adminNote || "").trim() || null,
    })
    .eq("id", body.requestId);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  await logAdminAudit({
    actorUserId: auth.userId,
    action: "profile_deletion_request.approve",
    entityType: "profile_deletion_request",
    entityId: body.requestId,
    beforeJson: reqRow as Record<string, unknown>,
    afterJson: { status: "approved", profileId },
  });
  return NextResponse.json({ ok: true });
}
