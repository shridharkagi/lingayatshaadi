import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";

/** WhatsApp group leads. GET ?q=&source=&limit=50&offset=0 */
export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") || "").trim().slice(0, 80);
  const source = sp.get("source") || "";
  const limit = Math.min(Number(sp.get("limit") || 50), 500);
  const offset = Math.max(Number(sp.get("offset") || 0), 0);

  const admin = createSupabaseAdmin();
  let query = admin
    .from("whatsapp_leads")
    .select("id, account_id, name, contact_no, city, source_page, status, date_of_joining, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (q) {
    const digits = q.replace(/\D/g, "");
    const safe = q.replace(/[%,()]/g, " ");
    query = digits.length >= 3
      ? query.or(`contact_no.ilike.%${digits}%,name.ilike.%${safe}%`)
      : query.or(`name.ilike.%${safe}%,city.ilike.%${safe}%`);
  }
  if (source) query = query.eq("source_page", source);
  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: sources } = await admin.from("whatsapp_leads").select("source_page").limit(5000);
  const sourceCounts: Record<string, number> = {};
  for (const r of (sources || []) as { source_page: string | null }[]) {
    const k = r.source_page || "unknown";
    sourceCounts[k] = (sourceCounts[k] || 0) + 1;
  }
  return NextResponse.json({ total: count || 0, rows: data || [], sources: sourceCounts });
}
