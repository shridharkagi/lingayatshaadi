import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";
import { isUsable, type PlanTemplate, type SubscriptionRow } from "@/lib/server/plans";

/** Plan templates (including hidden/archived) with how many accounts use each now. */
export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const admin = createSupabaseAdmin();
  const [plansRes, activeRes] = await Promise.all([
    admin.from("subscription_plans").select("*").order("sort_order", { ascending: true }).order("price", { ascending: true }),
    admin.from("user_subscriptions").select("plan_id, status, starts_at, expires_at").eq("status", "active"),
  ]);
  if (plansRes.error) return NextResponse.json({ error: plansRes.error.message }, { status: 500 });
  const counts = new Map<string, number>();
  for (const s of (activeRes.data || []) as SubscriptionRow[]) {
    if (s.plan_id && isUsable(s)) counts.set(s.plan_id, (counts.get(s.plan_id) || 0) + 1);
  }
  const plans = ((plansRes.data || []) as PlanTemplate[]).map((p) => ({ ...p, activeMembers: counts.get(p.id) || 0 }));
  return NextResponse.json({ plans });
}
