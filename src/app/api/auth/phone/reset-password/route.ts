import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { normalizeIndianPhone, syntheticEmailForPhone } from "@/lib/phoneAuth";
import { verifyPhoneOtpChallenge } from "@/lib/server/phoneOtpChallenge";
import { issueMagicLinkSession } from "@/lib/server/issueMagicLinkSession";
import { resolveOtpChannel } from "@/lib/phoneOtpConfig";

export const runtime = "nodejs";

async function findUserForPasswordReset(
  supabase: SupabaseClient,
  phoneE164: string,
  syntheticEmailLower: string
): Promise<User | null> {
  let page = 1;
  const perPage = 1000;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const u = data.users.find(
      (x) =>
        x.phone === phoneE164 ||
        (x.email && x.email.toLowerCase() === syntheticEmailLower)
    );
    if (u) return u;
    if (!data.users.length || data.users.length < perPage) return null;
    page += 1;
  }
}

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

  const synthetic = syntheticEmailForPhone(parsed.digits10).toLowerCase();
  let user;
  try {
    user = await findUserForPasswordReset(supabaseAdmin, parsed.e164, synthetic);
  } catch (e) {
    console.error("reset-password listUsers:", e);
    return NextResponse.json({ error: "Could not look up account" }, { status: 500 });
  }

  if (!user) {
    return NextResponse.json({ error: "No account found for this mobile number" }, { status: 404 });
  }

  const sessionEmail = (user.email && user.email.trim()) || syntheticEmailForPhone(parsed.digits10);

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
