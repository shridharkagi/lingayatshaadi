import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";
import { parseListDates } from "@/lib/server/adminRange";

/**
 * Profiles list. GET ?q=&status=all|live|pending|draft|rejected|suspended|blocked|deleted|everything
 *   &gender=male|female&state=&photo=with|without
 *   &rel=self|family|parent|sibling|son|daughter|brother|sister|other
 *   &from=YYYY-MM-DD&to=YYYY-MM-DD&dateOn=created|approved
 *   &sort=newest|oldest|name|most_viewed|most_contacted|recently_approved&limit=25&offset=0
 */
export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const sp = req.nextUrl.searchParams;
  const { from, to } = parseListDates(sp);
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.rpc("admin_list_profiles", {
    p_q: (sp.get("q") || "").slice(0, 80),
    p_status: sp.get("status") || "all",
    p_gender: sp.get("gender") || "",
    p_state: sp.get("state") || "",
    p_photo: sp.get("photo") || "",
    p_limit: Math.min(Number(sp.get("limit") || 25), 500),
    p_offset: Math.max(Number(sp.get("offset") || 0), 0),
    p_rel: sp.get("rel") || "",
    p_from: from,
    p_to: to,
    p_date_on: sp.get("dateOn") === "approved" ? "approved" : "created",
    p_sort: sp.get("sort") || "newest",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
