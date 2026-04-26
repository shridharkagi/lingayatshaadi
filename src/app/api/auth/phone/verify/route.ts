import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { authServiceRolePost } from "@/lib/postgrestServer";
import { normalizeIndianPhone, syntheticEmailForPhone } from "@/lib/phoneAuth";
import { resolveOtpChannel, normalizePurpose, type OtpPurpose } from "@/lib/phoneOtpConfig";
import { verifyPhoneOtpChallenge } from "@/lib/server/phoneOtpChallenge";
import { createSupabaseAdmin } from "@/lib/supabase";
import { ensureAccountCodeForUser } from "@/lib/server/accountCodes";
import { findAuthUserByPhone } from "@/lib/server/authUsers";
import { issueMagicLinkSession } from "@/lib/server/issueMagicLinkSession";

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

/**
 * Resolve the OTP purpose for a /verify call. The client now ideally sends a
 * `purpose` field, but legacy clients only send `password` — so we fall back
 * to the original convention: password present → signup, otherwise login.
 */
function resolveVerifyPurpose(rawPurpose: unknown, hasPassword: boolean): OtpPurpose {
  if (rawPurpose === "signup" || rawPurpose === "login" || rawPurpose === "password_reset") {
    return rawPurpose;
  }
  return hasPassword ? "signup" : "login";
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  let body: { phone?: string; otp?: string; password?: string; meta?: unknown; purpose?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawPassword = typeof body.password === "string" ? body.password : "";
  const hasPassword = rawPassword.length > 0;
  if (hasPassword && rawPassword.length < 8) {
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

  const purpose = normalizePurpose(resolveVerifyPurpose(body.purpose, hasPassword));
  const channel = resolveOtpChannel();

  if (channel === "fast2sms") {
    const verifyErr = await verifyPhoneOtpChallenge(parsed.e164, otpRaw, supabaseUrl, serviceKey);
    if (verifyErr) return NextResponse.json({ error: verifyErr }, { status: 400 });
  } else if (channel === "bypass") {
    // Accept any 6-digit code. No-op.
  } else {
    return NextResponse.json({ error: "OTP provider not configured" }, { status: 500 });
  }

  // After OTP is verified, look up the existing account (if any) so we can
  // route login vs signup deterministically. We accept BOTH the current and
  // legacy synthetic-email formats so users created before the `.in` TLD
  // correction continue to log into the SAME row instead of getting a fresh
  // duplicate.
  let admin;
  try {
    admin = createSupabaseAdmin();
  } catch (e) {
    console.error("[phone/verify] createSupabaseAdmin failed:", e);
    return NextResponse.json({ error: "Auth service is temporarily unavailable" }, { status: 503 });
  }

  let existing;
  try {
    existing = await findAuthUserByPhone(admin, parsed.e164, parsed.digits10);
  } catch (e) {
    console.error("[phone/verify] findAuthUserByPhone threw:", e);
    existing = null;
  }

  if (purpose === "signup") {
    return handleSignup({
      supabaseUrl,
      serviceKey,
      parsed,
      rawPassword,
      hasPassword,
      meta: sanitizeMeta(body.meta),
      existing,
      admin,
    });
  }

  // login / password_reset — never create a user.
  return handleLoginOrReset({
    supabaseUrl,
    serviceKey,
    parsed,
    existing,
    admin,
  });
}

async function handleLoginOrReset({
  supabaseUrl,
  serviceKey,
  parsed,
  existing,
  admin,
}: {
  supabaseUrl: string;
  serviceKey: string;
  parsed: { e164: string; digits10: string };
  existing: Awaited<ReturnType<typeof findAuthUserByPhone>>;
  admin: ReturnType<typeof createSupabaseAdmin>;
}) {
  if (!existing) {
    return NextResponse.json(
      {
        error:
          "No account found for this mobile number. Please create an account first.",
      },
      { status: 404 }
    );
  }

  // Use the user's ACTUAL stored email. Do NOT synthesise a fallback — if the
  // canonical row truly has no email column populated, synthesising would
  // either (a) match a different row's email and sign us into the wrong
  // account, or (b) match no row at all and (with the old magiclink flow)
  // create a brand-new duplicate. Either way it is unsafe. Surface a clear
  // admin-actionable error instead so we can repair the data.
  const sessionEmail = (existing.email && existing.email.trim()) || "";
  if (!sessionEmail) {
    console.error(
      "[phone/verify] login: matched auth row has NULL email — refusing to issue session",
      {
        user_id: existing.id,
        phone_e164: parsed.e164,
      }
    );
    return NextResponse.json(
      {
        error:
          "We could not complete sign-in for this account. Please contact support and quote reference " +
          existing.id.slice(0, 8) +
          ".",
      },
      { status: 500 }
    );
  }

  const session = await issueMagicLinkSession(supabaseUrl, serviceKey, sessionEmail);
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status || 500 });
  }

  try {
    await ensureAccountCodeForUser(admin, existing.id);
  } catch (e) {
    console.warn("[phone/verify] ensureAccountCodeForUser failed:", e);
  }

  return NextResponse.json({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    token_type: session.token_type,
  });
}

async function handleSignup({
  supabaseUrl,
  serviceKey,
  parsed,
  rawPassword,
  hasPassword,
  meta,
  existing,
  admin,
}: {
  supabaseUrl: string;
  serviceKey: string;
  parsed: { e164: string; digits10: string };
  rawPassword: string;
  hasPassword: boolean;
  meta: AccountMeta;
  existing: Awaited<ReturnType<typeof findAuthUserByPhone>>;
  admin: ReturnType<typeof createSupabaseAdmin>;
}) {
  if (existing) {
    return NextResponse.json(
      {
        error:
          "An account with this mobile number already exists. Please sign in instead.",
      },
      { status: 409 }
    );
  }

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

  const email = syntheticEmailForPhone(parsed.digits10);

  // For OTP signup without a password we still need *some* password on the
  // auth row (Supabase requires it for password sign-ins later). Use a random
  // 256-bit hex string so the user effectively has no usable password and
  // must use OTP login.
  const password = hasPassword
    ? rawPassword
    : createHash("sha256").update(randomBytes(32)).digest("hex") + randomBytes(8).toString("hex");

  const createPayload: Record<string, unknown> = {
    email,
    phone: parsed.e164,
    email_confirm: true,
    phone_confirm: true,
    password,
  };
  if (Object.keys(userMetadata).length > 0) createPayload.user_metadata = userMetadata;

  const createRes = await authServiceRolePost(supabaseUrl, serviceKey, "/auth/v1/admin/users", createPayload);
  let createdUserId: string | null = null;
  try {
    const createJson = JSON.parse(createRes.body) as { id?: string; user?: { id?: string } };
    createdUserId = createJson.user?.id || createJson.id || null;
  } catch {
    /* ignore */
  }

  if (createRes.statusCode < 200 || createRes.statusCode >= 300) {
    const msg = authErrorMessage(createRes.body);
    if (isDuplicateUserError(msg)) {
      // findAuthUserByPhone missed it (e.g. listUsers fallback failed) but
      // Supabase saw a collision — surface the same friendly 409 instead of
      // silently signing into the existing account.
      return NextResponse.json(
        {
          error:
            "An account with this mobile number already exists. Please sign in instead.",
        },
        { status: 409 }
      );
    }
    console.error("createUser:", createRes.statusCode, createRes.body);
    return NextResponse.json({ error: msg || "Could not create account" }, { status: 500 });
  }

  const session = await issueMagicLinkSession(supabaseUrl, serviceKey, email);
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status || 500 });
  }

  if (createdUserId) {
    try {
      await ensureAccountCodeForUser(admin, createdUserId);
    } catch (e) {
      console.warn("[phone/verify] ensureAccountCodeForUser failed:", e);
    }
  }

  return NextResponse.json({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    token_type: session.token_type,
  });
}
