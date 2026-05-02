import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireAuthUser } from "@/lib/server/requireAuthUser";
import { resolveAccountAccess } from "@/lib/accessPolicy";
import { ensureFreePlanForUser } from "@/lib/server/freePlanProvisioning";
import {
  listOwnedProfileIdsIncludingDeleted,
  userSubscriptionsOrFilter,
} from "@/lib/server/subscriptionLookup";

export async function GET(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createSupabaseAdmin();
  const nowIso = new Date().toISOString();

  // Backfill: older accounts without any active plan receive Free automatically.
  await ensureFreePlanForUser(admin, auth.userId);

  const [{ data: ownedProfiles, count: nonDeletedProfileCount }, subscriptionLookupProfileIds] =
    await Promise.all([
      admin
        .from("profiles")
        .select("id", { count: "exact" })
        .eq("user_id", auth.userId)
        .is("deleted_at", null),
      listOwnedProfileIdsIncludingDeleted(admin, auth.userId),
    ]);
  const orFilter = userSubscriptionsOrFilter(auth.userId, subscriptionLookupProfileIds);
  const { data: activeSubs } = await admin
    .from("user_subscriptions")
    .select("id")
    .or(orFilter)
    .eq("status", "active")
    .lte("starts_at", nowIso)
    .gte("expires_at", nowIso)
    .order("expires_at", { ascending: false })
    .limit(1);

  const access = resolveAccountAccess({
    isLoggedIn: true,
    nonDeletedProfileCount: Number(nonDeletedProfileCount || 0),
    hasValidSubscription: !!(activeSubs && activeSubs.length > 0),
  });

  return NextResponse.json({ access });
}
