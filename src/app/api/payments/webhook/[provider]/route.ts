import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import crypto from "node:crypto";

const SUPPORTED = new Set(["razorpay", "cashfree", "stripe"]);

function timingSafeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function computeHmac(rawBody: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
}

function verifyProviderSignature(provider: string, req: NextRequest, rawBody: string): boolean {
  const secret =
    (provider === "razorpay" ? process.env.RAZORPAY_WEBHOOK_SECRET : undefined) ||
    (provider === "cashfree" ? process.env.CASHFREE_WEBHOOK_SECRET : undefined) ||
    (provider === "stripe" ? process.env.STRIPE_WEBHOOK_SECRET : undefined) ||
    "";
  if (!secret) return false;

  const genericSig = req.headers.get("x-ls-signature");
  if (genericSig) {
    return timingSafeEqual(computeHmac(rawBody, secret), genericSig.trim());
  }

  if (provider === "razorpay") {
    const sig = req.headers.get("x-razorpay-signature");
    if (!sig) return false;
    return timingSafeEqual(computeHmac(rawBody, secret), sig.trim());
  }

  if (provider === "cashfree") {
    const sig = req.headers.get("x-webhook-signature");
    if (!sig) return false;
    return timingSafeEqual(computeHmac(rawBody, secret), sig.trim());
  }

  if (provider === "stripe") {
    const header = req.headers.get("stripe-signature");
    if (!header) return false;
    const v1 = header
      .split(",")
      .map((p) => p.trim())
      .find((p) => p.startsWith("v1="))
      ?.slice(3);
    if (!v1) return false;
    return timingSafeEqual(computeHmac(rawBody, secret), v1);
  }

  return false;
}

function mapWebhookStatus(payload: Record<string, unknown>): "initiated" | "paid" | "failed" | "refunded" {
  const raw = String(payload.status || payload.event || payload.type || "").toLowerCase();
  if (raw.includes("refund")) return "refunded";
  if (raw.includes("fail")) return "failed";
  if (raw.includes("paid") || raw.includes("captured") || raw.includes("success")) return "paid";
  return "initiated";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  if (!SUPPORTED.has(provider)) {
    return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
  }

  const rawBody = await req.text();
  let payload: Record<string, unknown> = {};
  try {
    payload = (rawBody ? JSON.parse(rawBody) : {}) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!verifyProviderSignature(provider, req, rawBody)) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  const admin = createSupabaseAdmin();
  const eventId =
    (payload.id as string | undefined) ||
    (payload.eventId as string | undefined) ||
    crypto.createHash("sha256").update(rawBody).digest("hex");

  const { data: existing } = await admin
    .from("payment_transactions")
    .select("id")
    .eq("provider", provider)
    .eq("external_txn_id", eventId)
    .maybeSingle();
  if (existing?.id) {
    return NextResponse.json({ ok: true, duplicate: true, transactionId: existing.id });
  }

  const userId = payload.userId as string | undefined;
  if (userId) {
    const { error } = await admin.from("payment_transactions").insert({
      user_id: userId,
      provider,
      external_txn_id: eventId,
      amount: Number((payload.amount as number | undefined) || 0),
      currency: (payload.currency as string | undefined) || "INR",
      status: mapWebhookStatus(payload),
      metadata: payload,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    message: "Webhook verified and recorded.",
  });
}
