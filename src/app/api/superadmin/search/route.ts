import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";

/**
 * Global admin search across accounts (phone, U-code, name) and profiles
 * (member ID, name, contact number).
 *   GET /api/superadmin/search?q=98444
 */
export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const q = (req.nextUrl.searchParams.get("q") || "").slice(0, 80);
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.rpc("admin_search", { p_q: q, p_limit: 8 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
