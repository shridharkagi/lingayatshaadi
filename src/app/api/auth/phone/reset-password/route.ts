import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeIndianPhone } from "@/lib/phoneAuth";
import { verifyPhoneOtpChallenge } from "@/lib/server/phoneOtpChallenge";
import { issueMagicLinkSession } from "@/lib/server/issueMagicLinkSession";
import { resolveOtpChannel } from "@/lib/phoneOtpConfig";
import { findAuthUserByPhone } from "@/lib/server/authUsers";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  let body: { phone?: string; otp?: string; new_password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const newPassword = typeof body.new_password === "string" ? body.new_password : "";
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const parsed = normalizeIndianPhone(body.phone ?? "");
  if (!parsed) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }

  const otpRaw = (body.otp ?? "").replace(/\D/g, "");
  if (otpRaw.length !== 6) {
    return NextResponse.json({ error: "Enter the 6-digit OTP" }, { status: 400 });
  }

  const channel = resolveOtpChannel();
  if (channel === "fast2sms") {
    const verifyErr = await verifyPhoneOtpChallenge(parsed.e164, otpRaw, supabaseUrl, serviceKey);
    if (verifyErr) return NextResponse.json({ error: verifyErr }, { status: 400 });
  } else if (channel === "bypass") {
    // dev only
  } else {
    return NextResponse.json({ error: "OTP provider not configured" }, { status: 500 });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Use the shared helper so both legacy (`@phone.otp.lingayatshaadi`) and
  // current (`@phone.otp.lingayatshaadi.in`) synthetic-email accounts match,
  // and so reset-password and login/verify all use the SAME lookup contract.
  let user;
  try {
    user = await findAuthUserByPhone(supabaseAdmin, parsed.e164, parsed.digits10);
  } catch (e) {
    console.error("reset-password findAuthUserByPhone:", e);
    return NextResponse.json({ error: "Could not look up account" }, { status: 500 });
  }

  if (!user) {
    return NextResponse.json({ error: "No account found for this mobile number" }, { status: 404 });
  }

  // Same defence as /phone/verify: never synthesise an email when the
  // matched row has none. If a user truly has no email column we cannot
  // safely issue a session via the email-based gotrue flow without risking
  // creating a duplicate row. The user's password update is harmless to do
  // either way (it is keyed by user_id), but we ABORT before issuing the
  // session if email is missing — surfacing a clear support-quotable error
  // — instead of silently routing into a parallel account.
  const sessionEmail = (user.email && user.email.trim()) || "";
  if (!sessionEmail) {
    console.error(
      "[reset-password] matched auth row has NULL email — refusing to issue session",
      { user_id: user.id, phone_e164: parsed.e164 }
    );
    return NextResponse.json(
      {
        error:
          "We could not complete sign-in for this account. Please contact support and quote reference " +
          user.id.slice(0, 8) +
          ".",
      },
      { status: 500 }
    );
  }

  const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    password: newPassword,
  });
  if (updErr) {
    console.error("reset-password updateUser:", updErr);
    return NextResponse.json(
      { error: updErr.message || "Could not update password" },
      { status: 500 }
    );
  }

  const session = await issueMagicLinkSession(supabaseUrl, serviceKey, sessionEmail);
  if (!session.ok) {
    return NextResponse.json(
      {
        error:
          session.error ||
          "Password updated but could not sign you in automatically. Try logging in with your new password.",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    token_type: session.token_type,
  });
}
