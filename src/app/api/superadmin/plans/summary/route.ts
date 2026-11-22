import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";
import { getPlanStats } from "@/lib/server/planStats";

/** Plan KPIs for the Plans page: revenue is for the current month (IST), net of refunds. */
export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const ist = new Date(Date.now() + 5.5 * 3600 * 1000);
  const from = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1) - 5.5 * 3600 * 1000);
  const stats = await getPlanStats(createSupabaseAdmin(), from, new Date());
  return NextResponse.json({ monthStart: from.toISOString(), ...stats });
}
