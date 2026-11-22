import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";
import { parseAdminRange } from "@/lib/server/adminRange";

/** Full reports for the admin Reports page. GET ?range=…|custom&from&to */
export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const r = parseAdminRange(req.nextUrl.searchParams);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data, error } = await admin.rpc("admin_reports", { p_from: r.from.toISOString(), p_to: r.to.toISOString() });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ range: r.range, from: r.from.toISOString(), to: r.to.toISOString(), ...(data as object) });
}
