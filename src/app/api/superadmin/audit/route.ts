import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";

/** Full audit log. GET ?area=profile|photo|subscription|account|…&q=<entity id>&limit=50&offset=0 */
export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const sp = req.nextUrl.searchParams;
  const area = (sp.get("area") || "").replace(/[^a-z_]/g, "");
  const q = (sp.get("q") || "").trim().replace(/[^0-9a-fA-F-]/g, "");
  const limit = Math.min(Number(sp.get("limit") || 50), 200);
  const offset = Math.max(Number(sp.get("offset") || 0), 0);

  const admin = createSupabaseAdmin();
  let query = admin
    .from("admin_audit_logs")
    .select("id, actor_user_id, action_type, entity_type, entity_id, before_json, after_json, meta, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (area) query = query.like("action_type", `${area}.%`);
  if (q.length >= 8) query = query.eq("entity_id", q);
  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: types } = await admin.from("admin_audit_logs").select("action_type").limit(5000);
  const areas: Record<string, number> = {};
  for (const t of (types || []) as { action_type: string }[]) {
    const a = String(t.action_type || "").split(".")[0];
    areas[a] = (areas[a] || 0) + 1;
  }
  return NextResponse.json({ total: count || 0, rows: data || [], areas });
}
