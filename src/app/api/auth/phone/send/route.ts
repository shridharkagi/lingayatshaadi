import { NextRequest, NextResponse } from "next/server";
import {
  postgrestDeleteEq,
  postgrestSelectMaybeOne,
  postgrestUpsert,
} from "@/lib/postgrestServer";
import { hashPhoneOtp, normalizeIndianPhone } from "@/lib/phoneAuth";
import {
  fast2smsMessageFor,
  fast2smsTemplateIdFor,
  normalizePurpose,
  resolveOtpChannel,
} from "@/lib/phoneOtpConfig";
import { fast2smsSendDltOtp } from "@/lib/fast2smsVerify";

/** Ensure Node runtime (not Edge) so server-side fetch to Supabase matches local curl behavior. */
export const runtime = "nodejs";

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;

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
  let body: { phone?: string; purpose?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = normalizeIndianPhone(body.phone ?? "");
  if (!parsed) {
    return NextResponse.json({ error: "Enter a valid 10-digit Indian mobile number" }, { status: 400 });
  }

  const purpose = normalizePurpose(body.purpose);
  const channel = resolveOtpChannel();

  if (channel === "bypass") {
    return NextResponse.json({ ok: true, channel: "bypass" });
  }

  if (channel === "fast2sms") {
    return sendViaFast2Sms(parsed, purpose);
  }

  return NextResponse.json(
    {
      error:
        "No OTP provider configured. Set DEV_OTP_BYPASS=true (dev) or FAST2SMS_API_KEY (prod).",
    },
    { status: 500 }
  );
}

async function sendViaFast2Sms(
  parsed: { e164: string; digits10: string },
  purpose: ReturnType<typeof normalizePurpose>
) {
  const secret = process.env.PHONE_OTP_SECRET;
  if (!secret || secret.length < 16) {
    return NextResponse.json(
      { error: "Server misconfiguration: PHONE_OTP_SECRET is not set (min 16 chars)" },
      { status: 500 }
    );
  }

  const apiKey = process.env.FAST2SMS_API_KEY?.trim();
  const senderId = process.env.FAST2SMS_SENDER_ID?.trim();
  const templateId = fast2smsTemplateIdFor(purpose);

  if (!apiKey) {
    return NextResponse.json(
      { error: "Server misconfiguration: FAST2SMS_API_KEY is not set" },
      { status: 500 }
    );
  }
  if (!senderId) {
    return NextResponse.json(
      { error: "Server misconfiguration: FAST2SMS_SENDER_ID is not set" },
      { status: 500 }
    );
  }
  if (!templateId) {
    return NextResponse.json(
      {
        error: `Server misconfiguration: Fast2SMS template ID for purpose "${purpose}" is not set`,
      },
      { status: 500 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  // 30-second resend cooldown.
  const { row: existing, error: existingErr } = await postgrestSelectMaybeOne(
    supabaseUrl,
    serviceKey,
    "phone_otp_challenges",
    "phone",
    parsed.e164,
    "created_at"
  );

  if (existingErr) {
    const hint =
      /does not exist|phone_otp_challenges|42P01|PGRST205/i.test(existingErr)
        ? "Run supabase-phone-otp.sql in the Supabase SQL editor for this project."
        : null;
    const networkHint = explainSupabaseNetworkError(existingErr);
    return NextResponse.json(
      {
        error:
          networkHint ||
          (hint ? `Database not ready. ${hint}` : `Could not read verification state: ${existingErr}`),
      },
      { status: 500 }
    );
  }

  if (existing?.created_at) {
    const lastSentMs = new Date(existing.created_at as string).getTime();
    const elapsed = Date.now() - lastSentMs;
    if (Number.isFinite(lastSentMs) && elapsed >= 0 && elapsed < RESEND_COOLDOWN_MS) {
      const retryAfter = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      return NextResponse.json(
        {
          error: `Please wait ${retryAfter}s before requesting another OTP.`,
          retry_after: retryAfter,
        },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const codeHash = hashPhoneOtp(parsed.e164, otp, secret);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
  const createdAt = new Date().toISOString();

  const { error: dbError } = await postgrestUpsert(
    supabaseUrl,
    serviceKey,
    "phone_otp_challenges",
    "phone",
    {
      phone: parsed.e164,
      code_hash: codeHash,
      expires_at: expiresAt,
      created_at: createdAt,
    }
  );

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

  const messageText = fast2smsMessageFor(purpose, otp);
  const sendRes = await fast2smsSendDltOtp({
    apiKey,
    senderId,
    templateId,
    messageText,
    numbers: parsed.digits10,
  });

  // Always log the outcome so delivery issues are easy to investigate.
  if (sendRes.ok) {
    console.info(
      `[fast2sms] OK purpose=${purpose} phone=${parsed.e164} request_id=${sendRes.requestId ?? "n/a"} msg=${sendRes.message ?? ""}`
    );
  } else {
    console.error(
      `[fast2sms] ERR purpose=${purpose} phone=${parsed.e164} http=${sendRes.httpStatus ?? "n/a"} request_id=${sendRes.requestId ?? "n/a"} error=${sendRes.error ?? "unknown"}`
    );
    // Roll back so the next attempt is not rate-limited by our own cooldown.
    await postgrestDeleteEq(supabaseUrl, serviceKey, "phone_otp_challenges", "phone", parsed.e164);
    return NextResponse.json(
      { error: sendRes.error || "SMS gateway returned an error. Try again later." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    channel: "fast2sms",
    request_id: sendRes.requestId ?? null,
    cooldown_seconds: Math.ceil(RESEND_COOLDOWN_MS / 1000),
  });
}
