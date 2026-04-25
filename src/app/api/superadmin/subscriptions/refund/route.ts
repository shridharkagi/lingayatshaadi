import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";
import { logAdminAudit } from "@/lib/server/adminAudit";

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await req.json()) as {
    transactionId?: string;
    reason?: string;
  };
  if (!body.transactionId || !body.reason?.trim()) {
    return NextResponse.json({ error: "transactionId and reason are required" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const { data: before, error: fetchErr } = await admin
    .from("payment_transactions")
    .select("*")
    .eq("id", body.transactionId)
    .single();
  if (fetchErr || !before) {
    return NextResponse.json({ error: fetchErr?.message || "Transaction not found" }, { status: 404 });
  }
  if (before.status === "refunded") {
    return NextResponse.json({ error: "Transaction already refunded" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data: txn, error: txnErr } = await admin
    .from("payment_transactions")
    .update({
      status: "refunded",
      refunded_at: now,
      refund_reason: body.reason.trim(),
    })
    .eq("id", body.transactionId)
    .select("*")
    .single();
  if (txnErr || !txn) return NextResponse.json({ error: txnErr?.message || "Refund failed" }, { status: 500 });

  if (txn.subscription_id) {
    await admin
      .from("user_subscriptions")
      .update({ status: "refunded", updated_at: now })
      .eq("id", txn.subscription_id);
  }

  await logAdminAudit({
    actorUserId: auth.userId,
    action: "subscription.refund_manual",
    entityType: "payment_transaction",
    entityId: String(body.transactionId),
    beforeJson: before as Record<string, unknown>,
    afterJson: txn as Record<string, unknown>,
    meta: { reason: body.reason.trim() },
  });

  await admin.from("notifications").insert({
    user_id: String(txn.user_id),
    type: "general",
    title: "Subscription refund processed",
    message: "Your payment has been marked as refunded. Contact support for details.",
    read: false,
  });

  return NextResponse.json({ transaction: txn });
}
