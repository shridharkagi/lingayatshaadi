import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireAuthUser } from "@/lib/server/requireAuthUser";

const DAILY_LIMIT_MESSAGE =
  "You have reached today's contact view limit. Please try again tomorrow.";
const TOTAL_LIMIT_MESSAGE =
  "Your plan's total contact view limit is exhausted. Please upgrade or contact support for assistance.";

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

  const body = (await req.json()) as { viewerProfileId?: string; viewedProfileId?: string };
  if (!body.viewerProfileId || !body.viewedProfileId) {
    return NextResponse.json({ error: "viewerProfileId and viewedProfileId are required" }, { status: 400 });
  }
  if (body.viewerProfileId === body.viewedProfileId) {
    return NextResponse.json({ ok: true, recorded: false });
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
  const { data: existing } = await admin
    .from("contact_views")
    .select("viewer_id")
    .eq("viewer_id", body.viewerProfileId)
    .eq("viewed_id", body.viewedProfileId)
    .maybeSingle();

  if (!existing) {
    const { data: subRows } = await admin
      .from("user_subscriptions")
      .select("id, total_contact_views_snapshot, daily_contact_view_limit_snapshot")
      .or(`user_id.eq.${auth.userId},user_id.eq.${body.viewerProfileId}`)
      .eq("status", "active")
      .lte("starts_at", nowIso)
      .gte("expires_at", nowIso)
      .order("expires_at", { ascending: false })
      .limit(1);
    const activeSubscription = subRows?.[0];
    if (!activeSubscription) {
      return NextResponse.json({ error: TOTAL_LIMIT_MESSAGE, code: "SUBSCRIPTION_REQUIRED" }, { status: 403 });
    }

    const totalLimit = Number(activeSubscription.total_contact_views_snapshot || 0);
    const dailyLimit = Number(activeSubscription.daily_contact_view_limit_snapshot || 0);
    const { startUtc, endUtc } = getIstDayBoundsUtc();

    const [{ count: totalUsed }, { count: todayUsed }] = await Promise.all([
      admin
        .from("contact_views")
        .select("viewer_id", { count: "exact", head: true })
        .eq("viewer_id", body.viewerProfileId),
      admin
        .from("contact_views")
        .select("viewer_id", { count: "exact", head: true })
        .eq("viewer_id", body.viewerProfileId)
        .gte("viewed_at", startUtc)
        .lte("viewed_at", endUtc),
    ]);

    if (dailyLimit > 0 && Number(todayUsed || 0) >= dailyLimit) {
      await admin.from("notifications").insert({
        user_id: auth.userId,
        type: "general",
        title: "Daily contact limit reached",
        message: DAILY_LIMIT_MESSAGE,
        read: false,
      });
      return NextResponse.json({ error: DAILY_LIMIT_MESSAGE, code: "DAILY_LIMIT_REACHED" }, { status: 403 });
    }

    if (totalLimit > 0 && Number(totalUsed || 0) >= totalLimit) {
      await admin.from("notifications").insert({
        user_id: auth.userId,
        type: "general",
        title: "Contact limit exhausted",
        message: TOTAL_LIMIT_MESSAGE,
        read: false,
      });
      return NextResponse.json({ error: TOTAL_LIMIT_MESSAGE, code: "TOTAL_LIMIT_REACHED" }, { status: 403 });
    }
  }

  const { error } = await admin.from("contact_views").upsert(
    {
      viewer_id: body.viewerProfileId,
      viewed_id: body.viewedProfileId,
      viewed_at: nowIso,
    },
    { onConflict: "viewer_id,viewed_id" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, recorded: true });
}
