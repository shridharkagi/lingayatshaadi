import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";
import { parseAdminRange } from "@/lib/server/adminRange";

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
  const { data, error } = await admin.rpc("admin_overview", { p_from: r.from.toISOString(), p_to: r.to.toISOString() });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ range: r.range, from: r.from.toISOString(), to: r.to.toISOString(), ...(data as object) });
}
