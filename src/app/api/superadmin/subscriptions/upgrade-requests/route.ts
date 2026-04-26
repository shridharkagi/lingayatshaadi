import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";
import { logAdminAudit } from "@/lib/server/adminAudit";
import { resolveAccountCodeMap } from "@/lib/server/accountCodes";
import { listAllAuthUsers, type AuthUserLite } from "@/lib/server/authUsers";

type UpgradeRow = {
  id: string;
  user_id: string;
  profile_id: string | null;
  plan_id: string;
  plan_code: string | null;
  plan_name: string;
  plan_price: number;
  callback_number: string;
  note: string | null;
  status: string;
  email_notification_status?: string;
  email_notification_error?: string | null;
  whatsapp_notification_status?: string;
  whatsapp_notification_error?: string | null;
  created_at: string;
  updated_at?: string;
};

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("subscription_upgrade_requests")
    .select("id, user_id, profile_id, plan_id, plan_code, plan_name, plan_price, callback_number, note, status, email_notification_status, email_notification_error, whatsapp_notification_status, whatsapp_notification_error, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const requests = (data || []) as UpgradeRow[];
  const userIds = [...new Set(requests.map((r) => r.user_id).filter(Boolean))];

  let authUsers: AuthUserLite[] = [];
  try {
    authUsers = await listAllAuthUsers(admin);
  } catch {
    authUsers = [];
  }
  const codeByUser = await resolveAccountCodeMap(
    admin,
    authUsers.map((u) => ({ id: u.id, created_at: u.created_at }))
  );

  type Prof = { id: string; full_name: string | null; user_id: string };
  let profRows: Prof[] = [];
  if (userIds.length > 0) {
    const { data: pr } = await admin.from("profiles").select("id, full_name, user_id").in("user_id", userIds);
    profRows = (pr || []) as Prof[];
  }
  const profilesByUser = new Map<string, Prof[]>();
  for (const p of profRows) {
    const uid = String(p.user_id);
    if (!profilesByUser.has(uid)) profilesByUser.set(uid, []);
    profilesByUser.get(uid)!.push(p);
  }

  const enriched = requests.map((r) => {
    const uid = r.user_id;
    const member_account_code = codeByUser.get(uid) || null;
    const list = profilesByUser.get(uid) || [];
    let member_full_name: string | null = null;
    if (r.profile_id) {
      member_full_name = list.find((p) => p.id === r.profile_id)?.full_name ?? null;
    }
    if (!member_full_name) member_full_name = list[0]?.full_name ?? null;
    return {
      ...r,
      member_account_code,
      member_full_name,
    };
  });

  return NextResponse.json({ requests: enriched });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await req.json()) as {
    id?: string;
    status?: "new" | "contacted" | "closed";
  };
  if (!body.id || !body.status) {
    return NextResponse.json({ error: "id and status are required" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const { data: before } = await admin
    .from("subscription_upgrade_requests")
    .select("*")
    .eq("id", body.id)
    .single();

  const { data: updated, error } = await admin
    .from("subscription_upgrade_requests")
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq("id", body.id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAudit({
    actorUserId: auth.userId,
    action: "subscription.upgrade_request_status",
    entityType: "subscription_upgrade_request",
    entityId: String(body.id),
    beforeJson: (before || {}) as Record<string, unknown>,
    afterJson: (updated || {}) as Record<string, unknown>,
  });

  return NextResponse.json({ request: updated });
}
