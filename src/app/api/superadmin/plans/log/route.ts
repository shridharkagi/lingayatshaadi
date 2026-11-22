import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";
import { getPersistedAccountCodeMap } from "@/lib/server/accountCodes";

type Row = Record<string, unknown>;

/**
 * Plan change log. GET ?accountId=&action=&batchId=&from=YYYY-MM-DD&to=YYYY-MM-DD&limit=&offset=
 * Returns events newest first with account code/name, admin name and plan name.
 */
export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const sp = req.nextUrl.searchParams;
  const limit = Math.min(Math.max(Number(sp.get("limit") || 50), 1), 200);
  const offset = Math.max(Number(sp.get("offset") || 0), 0);
  const admin = createSupabaseAdmin();

  let q = admin.from("subscription_events").select("*", { count: "exact" }).order("created_at", { ascending: false });
  if (sp.get("accountId")) q = q.eq("user_id", sp.get("accountId")!);
  if (sp.get("batchId")) q = q.eq("batch_id", sp.get("batchId")!);
  const action = sp.get("action");
  if (action === "payments") q = q.like("action", "payment_%");
  else if (action === "templates") q = q.like("action", "template_%");
  else if (action) q = q.eq("action", action);
  if (sp.get("from")) q = q.gte("created_at", new Date(`${sp.get("from")}T00:00:00+05:30`).toISOString());
  if (sp.get("to")) q = q.lt("created_at", new Date(new Date(`${sp.get("to")}T00:00:00+05:30`).getTime() + 86_400_000).toISOString());
  const { data, error, count } = await q.range(offset, offset + limit - 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const events = (data || []) as Row[];

  const accountIds = [...new Set(events.map((e) => String(e.user_id || "")).filter(Boolean))];
  const actorIds = [...new Set(events.map((e) => String(e.actor_user_id || "")).filter(Boolean))];
  const planIds = [...new Set(events.map((e) => String(e.plan_id || "")).filter(Boolean))];
  const [codes, plans, actors] = await Promise.all([
    getPersistedAccountCodeMap(admin, accountIds),
    planIds.length ? admin.from("subscription_plans").select("id, name").in("id", planIds) : Promise.resolve({ data: [] as Row[] }),
    Promise.all(
      [...new Set([...actorIds, ...accountIds])].map(async (id) => {
        const { data: u } = await admin.auth.admin.getUserById(id);
        return [id, String((u?.user?.user_metadata as Row | undefined)?.full_name || "")] as const;
      })
    ),
  ]);
  const planName = new Map(((plans.data || []) as Row[]).map((p) => [String(p.id), String(p.name)]));
  const nameById = new Map(actors);

  return NextResponse.json({
    total: count || 0,
    events: events.map((e) => ({
      id: e.id,
      at: e.created_at,
      action: e.action,
      reason: e.reason,
      before: e.before_json,
      after: e.after_json,
      batchId: e.batch_id,
      subscriptionId: e.subscription_id,
      paymentId: e.payment_id,
      planName: e.plan_id ? planName.get(String(e.plan_id)) || null : null,
      account: e.user_id
        ? { id: e.user_id, code: codes.get(String(e.user_id)) || null, name: nameById.get(String(e.user_id)) || null }
        : null,
      actor: e.actor_user_id ? nameById.get(String(e.actor_user_id)) || "Admin" : "System",
    })),
  });
}
