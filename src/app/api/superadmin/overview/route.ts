import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";

const RANGE_DAYS: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90, "365d": 365 };

/**
 * Admin Overview data: inbox counts, KPIs (current vs previous period),
 * funnel, daily series, member mix, recent admin activity.
 * Computed in the database by admin_overview() so counts are exact.
 *   GET /api/superadmin/overview?range=30d | range=custom&from=2026-10-01&to=2026-10-31
 */
export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const sp = req.nextUrl.searchParams;
  const range = sp.get("range") || "30d";
  let to = new Date();
  let from = new Date(to.getTime() - (RANGE_DAYS[range] ?? 30) * 24 * 60 * 60 * 1000);
  // Custom range: ?range=custom&from=YYYY-MM-DD&to=YYYY-MM-DD (dates in IST, "to" inclusive).
  if (range === "custom") {
    const f = sp.get("from");
    const t = sp.get("to");
    const fromD = f ? new Date(`${f}T00:00:00+05:30`) : null;
    const toD = t ? new Date(`${t}T00:00:00+05:30`) : null;
    if (!fromD || !toD || Number.isNaN(fromD.getTime()) || Number.isNaN(toD.getTime()) || toD < fromD) {
      return NextResponse.json({ error: "Choose a valid From and To date" }, { status: 400 });
    }
    from = fromD;
    to = new Date(toD.getTime() + 24 * 60 * 60 * 1000);
    if (to.getTime() - from.getTime() > 3 * 366 * 24 * 60 * 60 * 1000) {
      return NextResponse.json({ error: "Custom range can be at most 3 years" }, { status: 400 });
    }
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin.rpc("admin_overview", {
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ range, from: from.toISOString(), to: to.toISOString(), ...(data as object) });
}
