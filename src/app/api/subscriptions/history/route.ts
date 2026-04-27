import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireAuthUser } from "@/lib/server/requireAuthUser";

export async function GET(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createSupabaseAdmin();
  const [{ data: subs, error: subErr }, { data: txns, error: txnErr }] = await Promise.all([
    admin
      .from("user_subscriptions")
      .select("id, status, starts_at, expires_at, created_at, plan_name_snapshot, price_snapshot, currency_snapshot, notes")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false })
      .limit(100),
    admin
      .from("payment_transactions")
      .select("id, subscription_id, amount, currency, status, external_txn_id, paid_at, created_at, payment_mode, payer_source")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  if (subErr || txnErr) {
    return NextResponse.json({ error: subErr?.message || txnErr?.message || "Failed to load history" }, { status: 500 });
  }

  const maskedTxns = (txns || []).map((t) => {
    const payerSource = typeof t.payer_source === "string" ? t.payer_source : "";
    const maskedPayer =
      payerSource.length > 4 ? `${"*".repeat(Math.max(0, payerSource.length - 4))}${payerSource.slice(-4)}` : payerSource;
    return { ...t, payer_source: maskedPayer };
  });

  return NextResponse.json({ subscriptions: subs || [], transactions: maskedTxns });
}
