import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireAuthUser } from "@/lib/server/requireAuthUser";

export async function GET(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createSupabaseAdmin();
  const { data: ownedProfiles } = await admin
    .from("profiles")
    .select("id")
    .eq("user_id", auth.userId)
    .is("deleted_at", null)
    .limit(500);
  const ownedProfileIds = (ownedProfiles || [])
    .map((r) => String((r as { id?: string }).id || ""))
    .filter(Boolean);
  const lookupIds = Array.from(new Set([auth.userId, ...ownedProfileIds]));
  const orFilter = lookupIds.map((id) => `user_id.eq.${id}`).join(",");

  const subsWithNotesRes = await admin
    .from("user_subscriptions")
    .select("id, status, starts_at, expires_at, created_at, plan_name_snapshot, price_snapshot, currency_snapshot, notes")
    .or(orFilter)
    .order("created_at", { ascending: false })
    .limit(100);
  const subsRes =
    !subsWithNotesRes.error
      ? subsWithNotesRes
      : await admin
          .from("user_subscriptions")
          .select("id, status, starts_at, expires_at, created_at, plan_name_snapshot, price_snapshot, currency_snapshot")
          .or(orFilter)
          .order("created_at", { ascending: false })
          .limit(100);

  const [{ data: txns, error: txnErr }] = await Promise.all([
    admin
      .from("payment_transactions")
      .select("id, subscription_id, amount, currency, status, external_txn_id, paid_at, created_at, payment_mode, payer_source")
      .or(orFilter)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  if (subsRes.error || txnErr) {
    return NextResponse.json({ error: subsRes.error?.message || txnErr?.message || "Failed to load history" }, { status: 500 });
  }

  const maskedTxns = (txns || []).map((t) => {
    const payerSource = typeof t.payer_source === "string" ? t.payer_source : "";
    const maskedPayer =
      payerSource.length > 4 ? `${"*".repeat(Math.max(0, payerSource.length - 4))}${payerSource.slice(-4)}` : payerSource;
    return { ...t, payer_source: maskedPayer };
  });

  return NextResponse.json({ subscriptions: subsRes.data || [], transactions: maskedTxns });
}
