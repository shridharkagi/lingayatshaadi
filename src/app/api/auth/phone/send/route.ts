import { NextRequest, NextResponse } from "next/server";
import { postgrestUpsert, postgrestDeleteEq } from "@/lib/postgrestServer";
import { hashPhoneOtp, normalizeIndianPhone } from "@/lib/phoneAuth";
import { resolveOtpChannel } from "@/lib/phoneOtpConfig";
import { twilioStartSmsVerify } from "@/lib/twilioVerify";

/** Ensure Node runtime (not Edge) so server-side fetch to Supabase matches local curl behavior. */
export const runtime = "nodejs";

const APIHOME_BASE = "https://apihome.in/panel/api/bulksms/";
const OTP_TTL_MS = 10 * 60 * 1000;

function explainSupabaseNetworkError(message: string): string | null {
  if (/fetch failed|Failed to fetch|network|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|certificate|SSL/i.test(message)) {
    return (
      "Cannot reach Supabase from the dev server (Node fetch). Try: restart with npm run dev (IPv4-first DNS), " +
      "verify NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or use Legacy JWT keys in Project Settings → API if issues persist."
    );
  }
  return null;
}

export async function POST(request: NextRequest) {
  let body: { phone?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = normalizeIndianPhone(body.phone ?? "");
  if (!parsed) {
    return NextResponse.json({ error: "Enter a valid 10-digit Indian mobile number" }, { status: 400 });
  }

  const channel = resolveOtpChannel();

  if (channel === "bypass") {
    return NextResponse.json({ ok: true, channel: "bypass" });
  }

  if (channel === "twilio") {
    const result = await twilioStartSmsVerify(parsed.e164);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || "Could not send SMS via Twilio" },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true, channel: "twilio", status: result.status });
  }

  if (channel === "apihome") {
    return sendViaApiHome(parsed);
  }

  return NextResponse.json(
    {
      error:
        "No OTP provider configured. Set DEV_OTP_BYPASS=true, or configure TWILIO_* / APIHOME_SMS_KEY.",
    },
    { status: 500 }
  );
}

async function sendViaApiHome(parsed: { e164: string; digits10: string }) {
  const secret = process.env.PHONE_OTP_SECRET;
  if (!secret || secret.length < 16) {
    return NextResponse.json(
      { error: "Server misconfiguration: PHONE_OTP_SECRET is not set (min 16 chars)" },
      { status: 500 }
    );
  }

  const apiKey = process.env.APIHOME_SMS_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server misconfiguration: APIHOME_SMS_KEY is not set" },
      { status: 500 }
    );
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const codeHash = hashPhoneOtp(parsed.e164, otp, secret);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { error: dbError } = await postgrestUpsert(supabaseUrl, serviceKey, "phone_otp_challenges", "phone", {
    phone: parsed.e164,
    code_hash: codeHash,
    expires_at: expiresAt,
  });

  if (dbError) {
    console.error("phone_otp_challenges upsert:", dbError);
    const networkHint = explainSupabaseNetworkError(dbError);
    if (networkHint) {
      return NextResponse.json({ error: networkHint }, { status: 500 });
    }
    const hint =
      /does not exist|phone_otp_challenges|42P01|PGRST205/i.test(dbError)
        ? "Run supabase-phone-otp.sql in the Supabase SQL editor for this project."
        : null;
    return NextResponse.json(
      {
        error: hint ? `Database not ready. ${hint}` : `Could not save verification step: ${dbError}`,
      },
      { status: 500 }
    );
  }

  const url = new URL(APIHOME_BASE);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("mobile", parsed.digits10);
  url.searchParams.set("otp", otp);

  try {
    const smsRes = await fetch(url.toString(), { method: "GET", cache: "no-store" });
    const text = await smsRes.text();
    let json: { status?: string; remark?: string } = {};
    try {
      json = JSON.parse(text) as { status?: string };
    } catch {
      /* non-JSON response */
    }
    if (!smsRes.ok || (json.status && json.status.toLowerCase() !== "success")) {
      await postgrestDeleteEq(supabaseUrl, serviceKey, "phone_otp_challenges", "phone", parsed.e164);
      console.error("API HOME SMS error:", smsRes.status, text);
      return NextResponse.json(
        { error: json.remark || "SMS gateway returned an error. Try again later." },
        { status: 502 }
      );
    }
  } catch (e) {
    console.error("API HOME fetch:", e);
    await postgrestDeleteEq(supabaseUrl, serviceKey, "phone_otp_challenges", "phone", parsed.e164);
    return NextResponse.json({ error: "Could not reach SMS gateway" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, channel: "apihome" });
}
