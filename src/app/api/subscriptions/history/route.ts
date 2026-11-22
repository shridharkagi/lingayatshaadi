import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireAuthUser } from "@/lib/server/requireAuthUser";
import { accountProfileIds, effectiveStatus, type SubscriptionRow } from "@/lib/server/plans";

/** The logged-in account's plans (with contacts used in each period) and payments. */
export async function GET(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createSupabaseAdmin();
  const [ids, subsRes, txnRes] = await Promise.all([
    accountProfileIds(admin, auth.userId),
    admin.from("user_subscriptions").select("*").eq("user_id", auth.userId).order("starts_at", { ascending: false }).limit(100),
    admin
      .from("payment_transactions")
      .select("id, subscription_id, amount, refunded_amount, currency, status, external_txn_id, paid_at, created_at, payment_mode, payer_source")
      .eq("user_id", auth.userId)
      .neq("status", "void")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  if (subsRes.error || txnRes.error) {
    return NextResponse.json({ error: subsRes.error?.message || txnRes.error?.message || "Failed to load history" }, { status: 500 });
  }
  const subs = (subsRes.data || []) as SubscriptionRow[];

  // Contacts revealed in each plan period (one query over the whole range).
  let views: { viewed_at: string }[] = [];
  if (subs.length && ids.length) {
    const from = subs.reduce((m, s) => (s.starts_at < m ? s.starts_at : m), subs[0].starts_at);
    const to = subs.reduce((m, s) => (s.expires_at > m ? s.expires_at : m), subs[0].expires_at);
    const { data } = await admin.from("contact_views").select("viewed_at").in("viewer_id", ids).gte("viewed_at", from).lte("viewed_at", to).limit(10000);
    views = (data || []) as { viewed_at: string }[];
  }

  const subscriptions = subs.map((s) => {
    const end = s.ended_at && s.ended_at < s.expires_at ? s.ended_at : s.expires_at;
    return {
      ...s,
      status: effectiveStatus(s) === "expiring" || effectiveStatus(s) === "upcoming" ? "active" : effectiveStatus(s),
      contacts_used_count: views.filter((v) => v.viewed_at >= s.starts_at && v.viewed_at <= end).length,
      plan_name_resolved: s.plan_name_snapshot || "Membership plan",
    };
  });

  const transactions = (txnRes.data || []).map((t) => {
    const payer = typeof t.payer_source === "string" ? t.payer_source : "";
    return { ...t, payer_source: payer.length > 4 ? `${"*".repeat(payer.length - 4)}${payer.slice(-4)}` : payer };
  });

  return NextResponse.json({ subscriptions, transactions });
}
