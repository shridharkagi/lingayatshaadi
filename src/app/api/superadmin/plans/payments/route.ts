import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";
import { logAdminAudit } from "@/lib/server/adminAudit";
import {
  PlanError,
  recordPayment,
  refundPayment,
  updatePayment,
  voidPayment,
  type PaymentInput,
  type PaymentPatch,
} from "@/lib/server/plans";

/**
 * Offline payments for an account's plans.
 *   add     { accountId, subscriptionId?, payment: {amount, mode, transactionId, payerSource, paidAt, notes} }
 *   update  { paymentId, patch }
 *   refund  { paymentId, refund: { amount?, refundedAt?, mode?, endPlan? } }   (reason required)
 *   remove  { paymentId }  — entered by mistake; kept as 'void'                 (reason required)
 */
export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    accountId?: string;
    subscriptionId?: string | null;
    paymentId?: string;
    reason?: string;
    payment?: PaymentInput;
    patch?: PaymentPatch;
    refund?: { amount?: number; refundedAt?: string; mode?: string | null; endPlan?: boolean };
  };
  const reason = (body.reason || "").trim() || (body.action === "add" ? "Payment received" : "");
  if (!reason) return NextResponse.json({ error: "Please add a reason — every payment change is logged" }, { status: 400 });
  const ctx = { actorId: auth.userId, reason };
  const admin = createSupabaseAdmin();
  try {
    let payment;
    if (body.action === "add") {
      if (!body.accountId || !body.payment) return NextResponse.json({ error: "accountId and payment are required" }, { status: 400 });
      payment = await recordPayment(admin, { ...body.payment, accountId: body.accountId, subscriptionId: body.subscriptionId || null }, ctx);
    } else if (!body.paymentId) {
      return NextResponse.json({ error: "paymentId is required" }, { status: 400 });
    } else if (body.action === "update") {
      payment = await updatePayment(admin, body.paymentId, body.patch || {}, ctx);
    } else if (body.action === "refund") {
      payment = await refundPayment(admin, body.paymentId, body.refund || {}, ctx);
    } else if (body.action === "remove") {
      payment = await voidPayment(admin, body.paymentId, ctx);
    } else {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
    await logAdminAudit({
      actorUserId: auth.userId,
      action: "subscription.payment_change",
      entityType: "payment",
      entityId: payment.id,
      afterJson: { action: body.action, amount: payment.amount, refunded_amount: payment.refunded_amount, status: payment.status },
      meta: { reason, accountId: payment.user_id },
    });
    return NextResponse.json({ payment });
  } catch (e) {
    const status = e instanceof PlanError ? e.status : 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status });
  }
}
