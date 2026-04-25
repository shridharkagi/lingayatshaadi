import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ users: [] });

  const admin = createSupabaseAdmin();
  const qUpper = q.toUpperCase();
  const isAccountCodeQuery = /^U\d{4,}$/.test(qUpper);
  const digitsOnly = q.replace(/\D/g, "");
  const orClauses = [`public_id.ilike.%${q}%`, `user_id.eq.${q}`];
  if (digitsOnly) orClauses.push(`contact.ilike.%${digitsOnly}%`);
  const matchedUserIds = new Set<string>();
  const accountCodeByUser = new Map<string, string>();

  if (isAccountCodeQuery) {
    const { data: listed, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });
    const sorted = (listed.users || [])
      .slice()
      .sort(
        (a, b) =>
          new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
      );
    const monthSeq = new Map<string, number>();
    for (const u of sorted) {
      const dt = new Date(u.created_at || new Date().toISOString());
      const yy = String(dt.getFullYear()).slice(-2);
      const mm = String(dt.getMonth() + 1).padStart(2, "0");
      const key = `${yy}${mm}`;
      const n = (monthSeq.get(key) || 0) + 1;
      monthSeq.set(key, n);
      const code = `U${yy}${mm}${n}`;
      accountCodeByUser.set(u.id, code);
      if (code === qUpper || code.startsWith(qUpper)) matchedUserIds.add(u.id);
    }
  }

  const baseQuery = admin
    .from("profiles")
    .select("id, user_id, public_id, full_name, contact")
    .order("updated_at", { ascending: false })
    .limit(20);
  const profileRes =
    matchedUserIds.size > 0
      ? await baseQuery.in("user_id", Array.from(matchedUserIds))
      : await baseQuery.or(orClauses.join(","));
  if (profileRes.error) return NextResponse.json({ error: profileRes.error.message }, { status: 500 });

  const users = ((profileRes.data || []) as Array<Record<string, unknown>>).map((r) => {
    const row = r as {
      id?: string;
      user_id?: string;
      public_id?: string;
      full_name?: string;
      contact?: string;
    };
    return {
      profileId: row.id || null,
      userId: row.user_id || null,
      publicId: row.public_id || null,
      fullName: row.full_name || "Unknown",
      contact: row.contact || null,
      accountCode: row.user_id ? accountCodeByUser.get(row.user_id) || null : null,
    };
  });

  return NextResponse.json({ users });
}
