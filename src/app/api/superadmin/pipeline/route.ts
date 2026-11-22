import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";
import { logAdminAudit } from "@/lib/server/adminAudit";

type Row = Record<string, unknown>;
const STATUSES = ["new", "contacted", "closed"] as const;

/** Upgrade-request pipeline: requests with account info and current plan. */
export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const admin = createSupabaseAdmin();

  const { data: reqs, error } = await admin
    .from("subscription_upgrade_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = (reqs || []) as Row[];
  const userIds = Array.from(new Set(rows.map((r) => String(r.user_id || "")).filter(Boolean)));

  const [codes, subs] = await Promise.all([
    userIds.length ? admin.from("user_account_codes").select("user_id, account_code").in("user_id", userIds) : Promise.resolve({ data: [] as Row[] }),
    userIds.length
      ? admin
          .from("admin_subscriptions_v")
          .select("account_id, plan_display_name, price_snapshot, expires_at, status")
          .in("account_id", userIds)
          .eq("status", "active")
          .gt("expires_at", new Date().toISOString())
      : Promise.resolve({ data: [] as Row[] }),
  ]);
  const codeBy = new Map(((codes.data || []) as Row[]).map((r) => [String(r.user_id), String(r.account_code)]));
  const planBy = new Map<string, Row>();
  for (const s of (subs.data || []) as Row[]) planBy.set(String(s.account_id), s);
  const names = new Map<string, string>();
  await Promise.all(
    userIds.map(async (uid) => {
      const { data } = await admin.auth.admin.getUserById(uid);
      names.set(uid, String((data?.user?.user_metadata as Row | undefined)?.full_name || ""));
    })
  );

  return NextResponse.json({
    requests: rows.map((r) => {
      const uid = String(r.user_id || "");
      const plan = planBy.get(uid);
      return {
        id: r.id,
        userId: uid,
        accountCode: codeBy.get(uid) || null,
        name: names.get(uid) || "",
        planId: r.plan_id || null,
        planCode: r.plan_code,
        planName: r.plan_name,
        planPrice: r.plan_price,
        callbackNumber: r.callback_number,
        note: r.note,
        status: r.status,
        followUpAt: r.follow_up_at || null,
        adminNote: r.admin_note || null,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        currentPlan: plan ? { name: plan.plan_display_name, price: plan.price_snapshot, expiresAt: plan.expires_at } : null,
      };
    }),
  });
}

/** Update a request: PATCH { id, status?, followUpAt? (ISO|null), adminNote? } */
export async function PATCH(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    status?: string;
    followUpAt?: string | null;
    adminNote?: string | null;
  };
  if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  const patch: Row = { updated_at: new Date().toISOString() };
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status as (typeof STATUSES)[number])) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    patch.status = body.status;
  }
  if (body.followUpAt !== undefined) {
    if (body.followUpAt && Number.isNaN(new Date(body.followUpAt).getTime())) {
      return NextResponse.json({ error: "Invalid follow-up date" }, { status: 400 });
    }
    patch.follow_up_at = body.followUpAt || null;
  }
  if (body.adminNote !== undefined) patch.admin_note = (body.adminNote || "").slice(0, 2000) || null;

  const admin = createSupabaseAdmin();
  const { data: before } = await admin.from("subscription_upgrade_requests").select("status, follow_up_at, admin_note").eq("id", body.id).maybeSingle();
  const { error } = await admin.from("subscription_upgrade_requests").update(patch).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAdminAudit({
    actorUserId: auth.userId,
    action: "subscription.upgrade_request_status",
    entityType: "upgrade_request",
    entityId: body.id,
    beforeJson: (before || {}) as Record<string, unknown>,
    afterJson: patch,
  });
  return NextResponse.json({ ok: true });
}
