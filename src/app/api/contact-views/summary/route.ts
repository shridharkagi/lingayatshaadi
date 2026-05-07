import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireAuthUser } from "@/lib/server/requireAuthUser";
import {
  listOwnedProfileIdsIncludingDeleted,
  userSubscriptionsOrFilter,
} from "@/lib/server/subscriptionLookup";

function getIstDayBoundsUtc(now = new Date()) {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const y = ist.getUTCFullYear();
  const m = ist.getUTCMonth();
  const d = ist.getUTCDate();
  const startIst = Date.UTC(y, m, d, 0, 0, 0, 0);
  const endIst = Date.UTC(y, m, d + 1, 0, 0, 0, 0) - 1;
  return {
    startUtc: new Date(startIst - IST_OFFSET_MS).toISOString(),
    endUtc: new Date(endIst - IST_OFFSET_MS).toISOString(),
  };
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await req.json()) as { viewerProfileId?: string };
  if (!body.viewerProfileId) {
    return NextResponse.json({ error: "viewerProfileId is required" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const { data: viewerProfile } = await admin
    .from("profiles")
    .select("id, user_id")
    .eq("id", body.viewerProfileId)
    .single();

  if (!viewerProfile || viewerProfile.user_id !== auth.userId) {
    return NextResponse.json({ error: "Unauthorized profile access" }, { status: 403 });
  }

  const nowIso = new Date().toISOString();
  const { startUtc, endUtc } = getIstDayBoundsUtc();
  const subscriptionLookupProfileIds = await listOwnedProfileIdsIncludingDeleted(admin, auth.userId);
  const orFilter = userSubscriptionsOrFilter(auth.userId, subscriptionLookupProfileIds);

  const { data: subRows } = await admin
      .from("user_subscriptions")
      .select("id, starts_at, expires_at, total_contact_views_snapshot, daily_contact_view_limit_snapshot")
      .or(orFilter)
      .eq("status", "active")
      .lte("starts_at", nowIso)
      .gte("expires_at", nowIso)
      .order("expires_at", { ascending: false })
      .limit(1);

  const activeSubscription = subRows?.[0];
  const ownerViewerIds = subscriptionLookupProfileIds.length > 0
    ? subscriptionLookupProfileIds
    : [body.viewerProfileId];
  const viewerOrFilter = ownerViewerIds.map((id) => `viewer_id.eq.${id}`).join(",");
  const periodStart = activeSubscription?.starts_at || null;
  const periodEnd = activeSubscription?.expires_at || null;
  const effectiveTodayStart = periodStart && periodStart > startUtc ? periodStart : startUtc;
  const effectiveTodayEnd = periodEnd && periodEnd < endUtc ? periodEnd : endUtc;

  const [{ count: totalUsed }, { count: todayUsed }] = await Promise.all([
    periodStart && periodEnd
      ? admin
          .from("contact_views")
          .select("viewer_id", { count: "exact", head: true })
          .or(viewerOrFilter)
          .gte("viewed_at", periodStart)
          .lte("viewed_at", periodEnd)
      : admin
          .from("contact_views")
          .select("viewer_id", { count: "exact", head: true })
          .eq("viewer_id", body.viewerProfileId),
    admin
      .from("contact_views")
      .select("viewer_id", { count: "exact", head: true })
      .or(viewerOrFilter)
      .gte("viewed_at", effectiveTodayStart)
      .lte("viewed_at", effectiveTodayEnd),
  ]);

  const totalLimit = activeSubscription
    ? Number(activeSubscription.total_contact_views_snapshot || 0)
    : null;
  const dailyLimit = activeSubscription
    ? Number(activeSubscription.daily_contact_view_limit_snapshot || 0)
    : null;

  return NextResponse.json({
    summary: {
      totalUsed: Number(totalUsed || 0),
      totalLimit: totalLimit && totalLimit > 0 ? totalLimit : null,
      todayUsed: Number(todayUsed || 0),
      dailyLimit: dailyLimit && dailyLimit > 0 ? dailyLimit : null,
      activeStartsAt: periodStart,
      activeExpiresAt: periodEnd,
    },
  });
}
