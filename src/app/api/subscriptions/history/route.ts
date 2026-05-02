import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireAuthUser } from "@/lib/server/requireAuthUser";
import {
  listOwnedProfileIdsIncludingDeleted,
  userSubscriptionsOrFilter,
} from "@/lib/server/subscriptionLookup";

export async function GET(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createSupabaseAdmin();
  const ownedProfileIds = await listOwnedProfileIdsIncludingDeleted(admin, auth.userId);
  const contactViewerOrFilter = ownedProfileIds.map((id) => `viewer_id.eq.${id}`).join(",");
  const orFilter = userSubscriptionsOrFilter(auth.userId, ownedProfileIds);

  const subsWithNotesRes = await admin
    .from("user_subscriptions")
    .select("id, user_id, status, starts_at, expires_at, created_at, plan_name_snapshot, price_snapshot, currency_snapshot, total_contact_views_snapshot, daily_contact_view_limit_snapshot, notes")
    .or(orFilter)
    .order("created_at", { ascending: false })
    .limit(100);
  const subsRes =
    !subsWithNotesRes.error
      ? subsWithNotesRes
      : await admin
          .from("user_subscriptions")
          .select("id, user_id, status, starts_at, expires_at, created_at, plan_name_snapshot, price_snapshot, currency_snapshot, total_contact_views_snapshot, daily_contact_view_limit_snapshot")
          .or(orFilter)
          .order("created_at", { ascending: false })
          .limit(100);

  const subs = (subsRes.data || []) as Array<{
    id: string;
    user_id?: string;
    starts_at?: string;
    expires_at?: string;
  }>;
  const starts = subs
    .map((s) => new Date(String(s.starts_at || "")).getTime())
    .filter((n) => Number.isFinite(n));
  const expires = subs
    .map((s) => new Date(String(s.expires_at || "")).getTime())
    .filter((n) => Number.isFinite(n));
  const minStartIso = starts.length > 0 ? new Date(Math.min(...starts)).toISOString() : null;
  const maxExpiryIso = expires.length > 0 ? new Date(Math.max(...expires)).toISOString() : null;

  const [{ data: txns, error: txnErr }, { data: contactViews, error: viewsErr }] = await Promise.all([
    admin
      .from("payment_transactions")
      .select("id, subscription_id, amount, currency, status, external_txn_id, paid_at, created_at, payment_mode, payer_source")
      .or(orFilter)
      .order("created_at", { ascending: false })
      .limit(200),
    minStartIso && maxExpiryIso && contactViewerOrFilter
      ? admin
          .from("contact_views")
          .select("viewer_id, viewed_at")
          .or(contactViewerOrFilter)
          .gte("viewed_at", minStartIso)
          .lte("viewed_at", maxExpiryIso)
          .limit(10000)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (subsRes.error || txnErr || viewsErr) {
    return NextResponse.json(
      { error: subsRes.error?.message || txnErr?.message || viewsErr?.message || "Failed to load history" },
      { status: 500 }
    );
  }

  const maskedTxns = (txns || []).map((t) => {
    const payerSource = typeof t.payer_source === "string" ? t.payer_source : "";
    const maskedPayer =
      payerSource.length > 4 ? `${"*".repeat(Math.max(0, payerSource.length - 4))}${payerSource.slice(-4)}` : payerSource;
    return { ...t, payer_source: maskedPayer };
  });

  const views = (contactViews || []) as Array<{ viewer_id?: string; viewed_at?: string }>;
  const subscriptionsWithUsage = (subsRes.data || []).map((s) => {
    const sub = s as {
      user_id?: string;
      starts_at?: string;
      expires_at?: string;
    };
    const ownerId = String(sub.user_id || "");
    const startTs = new Date(String(sub.starts_at || "")).getTime();
    const endTs = new Date(String(sub.expires_at || "")).getTime();
    const contacts_used_count =
      ownerId && Number.isFinite(startTs) && Number.isFinite(endTs)
        ? views.filter((v) => {
            const viewerId = String(v.viewer_id || "");
            const belongsToSubscription =
              ownerId === auth.userId
                ? ownedProfileIds.includes(viewerId)
                : viewerId === ownerId;
            if (!belongsToSubscription) return false;
            const viewedTs = new Date(String(v.viewed_at || "")).getTime();
            return Number.isFinite(viewedTs) && viewedTs >= startTs && viewedTs <= endTs;
          }).length
        : 0;
    return { ...s, contacts_used_count };
  });

  return NextResponse.json({ subscriptions: subscriptionsWithUsage, transactions: maskedTxns });
}
