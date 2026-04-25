import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireAuthUser } from "@/lib/server/requireAuthUser";
import { computeAccountCodes } from "@/lib/accountCode";
import { listAllAuthUsers } from "@/lib/server/authUsers";

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

  const codes = computeAccountCodes(users);
  const accountCode = codes.get(auth.userId) || null;

  return NextResponse.json({ accountCode });
}
