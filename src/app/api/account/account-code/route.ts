import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireAuthUser } from "@/lib/server/requireAuthUser";
import { ensureAccountCodeForUser, getPersistedAccountCodeMap } from "@/lib/server/accountCodes";

/**
 * Returns the signed-in user's account code (U…).
 * Uses a single-row lookup + optional ensure RPC — no full auth user list.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createSupabaseAdmin();

  let persisted = await getPersistedAccountCodeMap(admin, [auth.userId]);
  let accountCode = persisted.get(auth.userId) || null;

  if (!accountCode) {
    const { data: authUser, error: getUserErr } = await admin.auth.admin.getUserById(auth.userId);
    if (getUserErr) {
      return NextResponse.json(
        { error: getUserErr.message || "Could not load auth user" },
        { status: 500 }
      );
    }
    const createdAt = authUser.user?.created_at ?? null;
    accountCode = await ensureAccountCodeForUser(admin, auth.userId, createdAt);
  }

  return NextResponse.json({ accountCode });
}
