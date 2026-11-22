import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";
import { parseListDates } from "@/lib/server/adminRange";

/**
 * Accounts list (logins). GET ?q=&filter=all|paid|no_plan|expiring|inactive|no_profile|pending|suspended
 *   &plan=|paid|none|<plan name>
 *   &sort=newest|oldest|name_asc|name_desc|views_desc|views_asc|login_desc|login_asc|quota_left
 *   &from=YYYY-MM-DD&to=YYYY-MM-DD&dateOn=joined|last_login&limit=25&offset=0
 */
export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const sp = req.nextUrl.searchParams;
  const { from, to } = parseListDates(sp);
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.rpc("admin_list_accounts", {
    p_q: (sp.get("q") || "").slice(0, 80),
    p_filter: sp.get("filter") || "all",
    p_sort: sp.get("sort") || "newest",
    p_limit: Math.min(Number(sp.get("limit") || 25), 500),
    p_offset: Math.max(Number(sp.get("offset") || 0), 0),
    p_from: from,
    p_to: to,
    p_date_on: sp.get("dateOn") === "last_login" ? "last_login" : "joined",
    p_plan: (sp.get("plan") || "").slice(0, 40),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
