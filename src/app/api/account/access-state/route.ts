import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireAuthUser } from "@/lib/server/requireAuthUser";
import { resolveAccountAccess } from "@/lib/accessPolicy";
import { getActiveRow, isUsable } from "@/lib/server/plans";

/** Logged-in member's access: profile count + whether a plan is usable now. */
export async function GET(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createSupabaseAdmin();
  // Free plans are granted when the first profile is approved (see
  // grantFreeOnApproval) — never here, and never at signup.
  const [{ count: nonDeletedProfileCount }, active] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("user_id", auth.userId).is("deleted_at", null),
    getActiveRow(admin, auth.userId),
  ]);

  const access = resolveAccountAccess({
    isLoggedIn: true,
    nonDeletedProfileCount: Number(nonDeletedProfileCount || 0),
    hasValidSubscription: isUsable(active),
  });
  return NextResponse.json({ access });
}
