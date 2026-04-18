import { NextRequest, NextResponse } from "next/server";
import {
  authServiceRolePost,
  postgrestDeleteEq,
  postgrestSelectMaybeOne,
} from "@/lib/postgrestServer";
import { hashPhoneOtp, normalizeIndianPhone, syntheticEmailForPhone } from "@/lib/phoneAuth";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { resolveOtpChannel } from "@/lib/phoneOtpConfig";
import { twilioCheckSmsVerify } from "@/lib/twilioVerify";

export const runtime = "nodejs";

interface AccountMeta {
  first_name?: string;
  last_name?: string;
  full_name?: string;
  gender?: "male" | "female";
  city?: string;
  /** ISO date, e.g. "1995-03-21" */
  date_of_birth?: string;
  /** 4-digit year, e.g. 1995 */
  birth_year?: number;
}

function isDuplicateUserError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("already been registered") ||
    m.includes("already registered") ||
    m.includes("user already exists") ||
    m.includes("duplicate")
  );
}

function authErrorMessage(body: string): string {
  try {
    const j = body ? (JSON.parse(body) as { msg?: string; message?: string; error_description?: string }) : {};
    return j.msg || j.message || j.error_description || body || "Auth request failed";
  } catch {
    return body || "Auth request failed";
  }
}

function sanitizeMeta(raw: unknown): AccountMeta {
  if (!raw || typeof raw !== "object") return {};
  const m = raw as Record<string, unknown>;
  const out: AccountMeta = {};
  if (typeof m.first_name === "string") out.first_name = m.first_name.trim().slice(0, 80);
  if (typeof m.last_name === "string") out.last_name = m.last_name.trim().slice(0, 80);
  if (typeof m.full_name === "string") out.full_name = m.full_name.trim().slice(0, 160);
  if (m.gender === "male" || m.gender === "female") out.gender = m.gender;
  if (typeof m.city === "string") out.city = m.city.trim().slice(0, 120);
  if (typeof m.date_of_birth === "string" && /^\d{4}-\d{2}-\d{2}$/.test(m.date_of_birth))
    out.date_of_birth = m.date_of_birth;
  if (typeof m.birth_year === "number" && m.birth_year >= 1900 && m.birth_year <= new Date().getFullYear())
    out.birth_year = m.birth_year;
  else if (typeof m.birth_year === "string" && /^\d{4}$/.test(m.birth_year))
    out.birth_year = Number(m.birth_year);
  return out;
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  let body: { phone?: string; otp?: string; password?: string; meta?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawPassword = typeof body.password === "string" ? body.password : "";
  const useSignupPassword = rawPassword.length > 0;
  if (useSignupPassword && rawPassword.length < 8) {
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

  if (channel === "twilio") {
    const result = await twilioCheckSmsVerify(parsed.e164, otpRaw);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || "Invalid OTP" },
        { status: 400 }
      );
    }
  } else if (channel === "apihome") {
    const verifyErr = await verifyApiHomeOtp(parsed.e164, otpRaw, supabaseUrl, serviceKey);
    if (verifyErr) return NextResponse.json({ error: verifyErr }, { status: 400 });
  } else if (channel === "bypass") {
    // Accept any 6-digit code. No-op.
  } else {
    return NextResponse.json({ error: "OTP provider not configured" }, { status: 500 });
  }

  const meta = sanitizeMeta(body.meta);
  const email = syntheticEmailForPhone(parsed.digits10);
  const password = useSignupPassword
    ? rawPassword
    : createHash("sha256").update(randomBytes(32)).digest("hex") + randomBytes(8).toString("hex");

  const computedFullName =
    meta.full_name ||
    [meta.first_name, meta.last_name].filter(Boolean).join(" ").trim() ||
    undefined;
  const userMetadata: Record<string, unknown> = {};
  if (meta.first_name) userMetadata.first_name = meta.first_name;
  if (meta.last_name) userMetadata.last_name = meta.last_name;
  if (computedFullName) userMetadata.full_name = computedFullName;
  if (meta.gender) userMetadata.gender = meta.gender;
  if (meta.city) userMetadata.city = meta.city;
  if (meta.date_of_birth) userMetadata.date_of_birth = meta.date_of_birth;
  if (meta.birth_year) userMetadata.birth_year = meta.birth_year;

  const createPayload: Record<string, unknown> = {
    email,
    phone: parsed.e164,
    email_confirm: true,
    phone_confirm: true,
    password,
  };
  if (Object.keys(userMetadata).length > 0) createPayload.user_metadata = userMetadata;

  const createRes = await authServiceRolePost(supabaseUrl, serviceKey, "/auth/v1/admin/users", createPayload);

  if (createRes.statusCode < 200 || createRes.statusCode >= 300) {
    const msg = authErrorMessage(createRes.body);
    if (isDuplicateUserError(msg)) {
      if (useSignupPassword) {
        return NextResponse.json(
          { error: "An account with this mobile number already exists. Sign in instead." },
          { status: 409 }
        );
      }
      // Existing user, OTP login — fall through to issue a session via magic link.
    } else {
      console.error("createUser:", createRes.statusCode, createRes.body);
      return NextResponse.json({ error: msg || "Could not create account" }, { status: 500 });
    }
  }

  const linkRes = await authServiceRolePost(supabaseUrl, serviceKey, "/auth/v1/admin/generate_link", {
    type: "magiclink",
    email,
  });

  if (linkRes.statusCode < 200 || linkRes.statusCode >= 300) {
    console.error("generate_link:", linkRes.statusCode, linkRes.body);
    return NextResponse.json(
      { error: authErrorMessage(linkRes.body) || "Could not complete sign-in" },
      { status: 500 }
    );
  }

  let hashedToken: string | undefined;
  try {
    const linkJson = JSON.parse(linkRes.body) as {
      properties?: { hashed_token?: string };
      hashed_token?: string;
    };
    hashedToken = linkJson.properties?.hashed_token ?? linkJson.hashed_token;
  } catch {
    /* ignore */
  }

  if (!hashedToken) {
    console.error("generate_link: missing hashed_token", linkRes.body);
    return NextResponse.json({ error: "Could not complete sign-in" }, { status: 500 });
  }

  const verifyRes = await authServiceRolePost(supabaseUrl, serviceKey, "/auth/v1/verify", {
    type: "email",
    token_hash: hashedToken,
    gotrue_meta_security: {},
  });

  if (verifyRes.statusCode < 200 || verifyRes.statusCode >= 300) {
    console.error("verify:", verifyRes.statusCode, verifyRes.body);
    return NextResponse.json(
      { error: authErrorMessage(verifyRes.body) || "Could not establish session" },
      { status: 500 }
    );
  }

  let session: {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    expires_at?: number;
    token_type?: string;
  };
  try {
    const verifyJson = JSON.parse(verifyRes.body) as {
      session?: typeof session;
      access_token?: string;
    };
    session = verifyJson.session ?? verifyJson;
  } catch {
    return NextResponse.json({ error: "Could not establish session" }, { status: 500 });
  }

  if (!session?.access_token || !session.refresh_token) {
    console.error("verify: no session in body", verifyRes.body);
    return NextResponse.json({ error: "Could not establish session" }, { status: 500 });
  }

  return NextResponse.json({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    token_type: session.token_type,
  });
}

/** Returns null on success, or an error message string. */
async function verifyApiHomeOtp(
  phoneE164: string,
  otpRaw: string,
  supabaseUrl: string,
  serviceKey: string
): Promise<string | null> {
  const secret = process.env.PHONE_OTP_SECRET;
  if (!secret || secret.length < 16) {
    return "Server misconfiguration: PHONE_OTP_SECRET is not set";
  }

  const { row, error: fetchErr } = await postgrestSelectMaybeOne(
    supabaseUrl,
    serviceKey,
    "phone_otp_challenges",
    "phone",
    phoneE164,
    "code_hash,expires_at"
  );

  if (fetchErr || !row) {
    return "No OTP found. Request a new code.";
  }

  if (new Date(row.expires_at as string).getTime() < Date.now()) {
    await postgrestDeleteEq(supabaseUrl, serviceKey, "phone_otp_challenges", "phone", phoneE164);
    return "OTP expired. Request a new code.";
  }

  const expectedHash = hashPhoneOtp(phoneE164, otpRaw, secret);
  const a = Buffer.from(expectedHash, "utf8");
  const b = Buffer.from(row.code_hash as string, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return "Invalid OTP";
  }

  await postgrestDeleteEq(supabaseUrl, serviceKey, "phone_otp_challenges", "phone", phoneE164);
  return null;
}
