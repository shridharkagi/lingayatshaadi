import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireAuthUser } from "@/lib/server/requireAuthUser";
import { accountProfileIds, getAccountAccess } from "@/lib/server/plans";

/** Contact quota for the logged-in account (pooled across its profiles). */
export async function POST(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await req.json().catch(() => ({}))) as { viewerProfileId?: string };
  const admin = createSupabaseAdmin();
  const ids = await accountProfileIds(admin, auth.userId);
  if (body.viewerProfileId && !ids.includes(body.viewerProfileId)) {
    return NextResponse.json({ error: "Unauthorized profile access" }, { status: 403 });
  }

  const access = await getAccountAccess(admin, auth.userId, ids);
  const sub = access.usable ? access.subscription : null;
  return NextResponse.json({
    summary: {
      totalUsed: access.usage.totalUsed,
      totalLimit: access.totalLimit,
      todayUsed: access.usage.todayUsed,
      dailyLimit: access.dailyLimit,
      activeStartsAt: sub?.starts_at ?? null,
      activeExpiresAt: sub?.expires_at ?? null,
      planName: sub?.plan_name_snapshot ?? null,
    },
  });
}
