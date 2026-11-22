import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";

const RANGE_DAYS: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90, "365d": 365 };

/**
 * Admin Overview data: inbox counts, KPIs (current vs previous period),
 * funnel, daily series, member mix, recent admin activity.
 * Computed in the database by admin_overview() so counts are exact.
 *   GET /api/superadmin/overview?range=30d
 */
export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const range = req.nextUrl.searchParams.get("range") || "30d";
  const days = RANGE_DAYS[range] ?? 30;
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

  const admin = createSupabaseAdmin();
  const { data, error } = await admin.rpc("admin_overview", {
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ range, from: from.toISOString(), to: to.toISOString(), ...(data as object) });
}
