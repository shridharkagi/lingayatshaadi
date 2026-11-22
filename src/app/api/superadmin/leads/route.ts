import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";
import { parseListDates } from "@/lib/server/adminRange";

/**
 * WhatsApp group leads. GET ?q=&source=&signed=yes|no&from=YYYY-MM-DD&to=YYYY-MM-DD
 *   &sort=newest|oldest|name|city&limit=50&offset=0
 */
export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") || "").trim().slice(0, 80);
  const source = sp.get("source") || "";
  const limit = Math.min(Number(sp.get("limit") || 50), 500);
  const offset = Math.max(Number(sp.get("offset") || 0), 0);
  const signed = sp.get("signed") || "";
  const { from, to } = parseListDates(sp);
  const sort = sp.get("sort") || "newest";
  const [col, asc] =
    sort === "oldest" ? ["created_at", true] : sort === "name" ? ["name", true] : sort === "city" ? ["city", true] : ["created_at", false];

  const admin = createSupabaseAdmin();
  let query = admin
    .from("whatsapp_leads")
    .select("id, account_id, name, contact_no, city, source_page, status, date_of_joining, created_at", { count: "exact" })
    .order(col as string, { ascending: asc as boolean, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (q) {
    const digits = q.replace(/\D/g, "");
    const safe = q.replace(/[%,()]/g, " ");
    query = digits.length >= 3
      ? query.or(`contact_no.ilike.%${digits}%,name.ilike.%${safe}%`)
      : query.or(`name.ilike.%${safe}%,city.ilike.%${safe}%`);
  }
  if (source === "unknown") query = query.is("source_page", null);
  else if (source) query = query.eq("source_page", source);
  if (signed === "yes") query = query.not("account_id", "is", null);
  if (signed === "no") query = query.is("account_id", null);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lt("created_at", to);
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
