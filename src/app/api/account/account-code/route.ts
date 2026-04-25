import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireAuthUser } from "@/lib/server/requireAuthUser";
import { computeAccountCodes } from "@/lib/accountCode";

export async function GET(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createSupabaseAdmin();
  const { data: listed, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const users = (listed.users || []).map((u) => ({
    id: u.id,
    created_at: u.created_at,
  }));
  const codes = computeAccountCodes(users);
  const accountCode = codes.get(auth.userId) || null;

  return NextResponse.json({ accountCode });
}
