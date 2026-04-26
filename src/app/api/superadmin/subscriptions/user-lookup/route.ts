import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";
import { getPersistedAccountCodeMap } from "@/lib/server/accountCodes";

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
    const { data: rows, error: codeErr } = await admin
      .from("user_account_codes")
      .select("user_id, account_code")
      .ilike("account_code", `${qUpper}%`)
      .limit(100);
    if (codeErr) return NextResponse.json({ error: codeErr.message }, { status: 500 });
    for (const raw of (rows || []) as Array<{ user_id?: string; account_code?: string }>) {
      const uid = String(raw.user_id || "");
      const code = String(raw.account_code || "");
      if (!uid || !code) continue;
      matchedUserIds.add(uid);
      accountCodeByUser.set(uid, code);
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

  const profileRows = (profileRes.data || []) as Array<Record<string, unknown>>;
  const rowUserIds = [
    ...new Set(
      profileRows
        .map((r) => String((r as { user_id?: string }).user_id || ""))
        .filter(Boolean)
    ),
  ];
  if (rowUserIds.length > 0) {
    const persisted = await getPersistedAccountCodeMap(admin, rowUserIds);
    for (const [uid, code] of persisted.entries()) accountCodeByUser.set(uid, code);
  }

  const users = profileRows.map((r) => {
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
