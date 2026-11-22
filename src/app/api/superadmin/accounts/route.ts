import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";

/**
 * Accounts list (logins). GET ?q=&filter=all|paid|no_plan|no_profile|pending|suspended
 *   &sort=newest|oldest|last_login|most_active|name&limit=25&offset=0
 */
export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const sp = req.nextUrl.searchParams;
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.rpc("admin_list_accounts", {
    p_q: (sp.get("q") || "").slice(0, 80),
    p_filter: sp.get("filter") || "all",
    p_sort: sp.get("sort") || "newest",
    p_limit: Math.min(Number(sp.get("limit") || 25), 500),
    p_offset: Math.max(Number(sp.get("offset") || 0), 0),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
