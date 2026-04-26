import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireAuthUser } from "@/lib/server/requireAuthUser";
import { listAllAuthUsers } from "@/lib/server/authUsers";
import { ensureAccountCodeForUser, resolveAccountCodeMap } from "@/lib/server/accountCodes";

export async function GET(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createSupabaseAdmin();
  let users: Array<{ id: string; created_at?: string | null }> = [];
  try {
    const listed = await listAllAuthUsers(admin);
    users = listed.map((u) => ({ id: u.id, created_at: u.created_at }));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not list auth users" },
      { status: 500 }
    );
  }

  const codes = await resolveAccountCodeMap(admin, users);
  let accountCode = codes.get(auth.userId) || null;
  if (!accountCode) {
    const createdAt = users.find((u) => u.id === auth.userId)?.created_at || null;
    accountCode = await ensureAccountCodeForUser(admin, auth.userId, createdAt);
  }

  return NextResponse.json({ accountCode });
}
