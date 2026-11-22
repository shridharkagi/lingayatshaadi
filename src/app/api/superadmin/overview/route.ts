import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";
import { parseAdminRange } from "@/lib/server/adminRange";
import { getPlanStats } from "@/lib/server/planStats";
import { getInboxCounts } from "@/lib/server/adminInbox";

/**
 * Admin Overview data: inbox counts, KPIs (current vs previous period),
 * funnel, daily series, member mix, recent admin activity.
 * Computed in the database by admin_overview() so counts are exact.
 *   GET /api/superadmin/overview?range=30d | range=custom&from=2026-10-01&to=2026-10-31
 */
export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const r = parseAdminRange(req.nextUrl.searchParams);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });

  const admin = createSupabaseAdmin();
  const [{ data, error }, plans, counts] = await Promise.all([
    admin.rpc("admin_overview", { p_from: r.from.toISOString(), p_to: r.to.toISOString() }),
    getPlanStats(admin, r.from, r.to),
    getInboxCounts(admin),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Revenue is shown NET of refunds (offline refunds are recorded on payments).
  const base = data as { kpis?: Record<string, number>; inbox?: Record<string, number> } & Record<string, unknown>;
  const kpis = { ...(base.kpis || {}), revenue: plans.revenue, revenuePrev: plans.revenuePrev, revenueAllTime: plans.revenueAllTime, paidMembers: plans.activePaid };
  const inbox = { ...(base.inbox || {}), ...counts, plansExpiring7d: plans.expiring7 };
  return NextResponse.json({ range: r.range, from: r.from.toISOString(), to: r.to.toISOString(), ...base, kpis, inbox, plans });
}
