import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireAuthUser } from "@/lib/server/requireAuthUser";

async function notifyByEmail(payload: {
  to: string;
  subject: string;
  html: string;
}) {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim() || "no-reply@lingayatbandhu.com";
  if (!resendApiKey) return { sent: false, reason: "RESEND_API_KEY not set" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { sent: false, reason: text || `HTTP ${res.status}` };
  }
  return { sent: true as const };
}

async function notifyWhatsAppWebhook(data: Record<string, unknown>) {
  const hook = process.env.WHATSAPP_NOTIFY_WEBHOOK_URL?.trim();
  if (!hook) return { sent: false, reason: "WHATSAPP_NOTIFY_WEBHOOK_URL not set" };
  const res = await fetch(hook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) return { sent: false, reason: `HTTP ${res.status}` };
  return { sent: true as const };
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await req.json()) as {
    planId?: string;
    callbackNumber?: string;
    note?: string;
  };
  if (!body.planId || !body.callbackNumber?.trim()) {
    return NextResponse.json({ error: "planId and callbackNumber are required" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const supportWhatsAppNumber = "6360130905";
  const [{ data: plan, error: planErr }, { data: profile }] = await Promise.all([
    admin
      .from("subscription_plans")
      .select("id, code, name, price, is_active")
      .eq("id", body.planId)
      .single(),
    admin
      .from("profiles")
      .select("id, full_name, contact")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);
  if (planErr || !plan) return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 });
  if (!plan.is_active) {
    return NextResponse.json({ error: "This plan is not available right now" }, { status: 400 });
  }

  const { data: requestRow, error: requestErr } = await admin
    .from("subscription_upgrade_requests")
    .insert({
      user_id: auth.userId,
      profile_id: profile?.id || null,
      plan_id: plan.id,
      plan_code: plan.code,
      plan_name: plan.name,
      plan_price: Number(plan.price || 0),
      callback_number: body.callbackNumber.trim(),
      note: body.note?.trim() || null,
    })
    .select("*")
    .single();
  if (requestErr || !requestRow) {
    return NextResponse.json({ error: requestErr?.message || "Failed to create request" }, { status: 500 });
  }

  const superadminsRes = await admin
    .from("profiles")
    .select("user_id")
    .eq("role", "superadmin")
    .not("user_id", "is", null);
  const superadminUserIds = Array.from(
    new Set((superadminsRes.data || []).map((r) => String(r.user_id || "")).filter(Boolean))
  );
  if (superadminUserIds.length) {
    await admin.from("notifications").insert(
      superadminUserIds.map((uid) => ({
        user_id: uid,
        type: "general",
        title: "New upgrade request",
        message: `${profile?.full_name || "A user"} requested ${plan.name}. Callback: ${body.callbackNumber}`,
        read: false,
      }))
    );
  }

  const adminEmail = process.env.SUBSCRIPTION_ADMIN_EMAIL?.trim();
  const fallbackAdminEmail = "LingayatBandhu@gmail.com";
  const targetAdminEmail = adminEmail || fallbackAdminEmail;
  const emailResult =
    targetAdminEmail
      ? await notifyByEmail({
          to: targetAdminEmail,
          subject: `Upgrade request: ${plan.name}`,
          html: `
            <h3>New subscription upgrade request</h3>
            <p><b>User ID:</b> ${auth.userId}</p>
            <p><b>Profile:</b> ${profile?.full_name || "N/A"}</p>
            <p><b>Plan:</b> ${plan.name} (${plan.code})</p>
            <p><b>Price:</b> INR ${Number(plan.price || 0)}</p>
            <p><b>Callback:</b> ${body.callbackNumber}</p>
            <p><b>Note:</b> ${body.note?.trim() || "-"}</p>
            <p><b>Request ID:</b> ${requestRow.id}</p>
          `,
        })
      : { sent: false, reason: "SUBSCRIPTION_ADMIN_EMAIL not set" };

  const whatsappResult = await notifyWhatsAppWebhook({
    support_number: supportWhatsAppNumber,
    template: "upgrade_request",
    request_id: requestRow.id,
    user_id: auth.userId,
    profile_name: profile?.full_name || null,
    callback_number: body.callbackNumber,
    plan_name: plan.name,
    plan_price: Number(plan.price || 0),
    note: body.note?.trim() || null,
  });

  const prefilledWhatsAppMessage = `Upgrade Request
Request ID: ${requestRow.id}
User ID: ${auth.userId}
Profile: ${profile?.full_name || "N/A"}
Plan: ${plan.name} (${plan.code})
Price: INR ${Number(plan.price || 0)}
Callback: ${body.callbackNumber}
Note: ${body.note?.trim() || "-"}`;
  const whatsappPrefillUrl = `https://wa.me/${supportWhatsAppNumber}?text=${encodeURIComponent(prefilledWhatsAppMessage)}`;

  await admin
    .from("subscription_upgrade_requests")
    .update({
      email_notification_status: emailResult.sent ? "sent" : "failed",
      email_notification_error: emailResult.sent ? null : emailResult.reason || "Unknown error",
      whatsapp_notification_status: whatsappResult.sent ? "sent" : "failed",
      whatsapp_notification_error: whatsappResult.sent ? null : whatsappResult.reason || "Unknown error",
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestRow.id);

  return NextResponse.json({
    ok: true,
    request: requestRow,
    notifications: {
      email: emailResult,
      whatsapp: whatsappResult,
    },
    whatsappPrefillUrl,
  });
}
