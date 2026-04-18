import { NextRequest, NextResponse } from "next/server";
import {
  authServiceRolePost,
  postgrestDeleteEq,
  postgrestSelectMaybeOne,
} from "@/lib/postgrestServer";
import { hashPhoneOtp, normalizeIndianPhone, syntheticEmailForPhone } from "@/lib/phoneAuth";
import { createHash, randomBytes, timingSafeEqual } from "crypto";

export const runtime = "nodejs";

function getSecret(): string | null {
  const s = process.env.PHONE_OTP_SECRET;
  if (s && s.length >= 16) return s;
  return null;
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

export async function POST(request: NextRequest) {
  const secret = getSecret();
  if (!secret) {
    return NextResponse.json(
      { error: "Server misconfiguration: PHONE_OTP_SECRET is not set" },
      { status: 500 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  let body: { phone?: string; otp?: string; password?: string };
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

  const { row, error: fetchErr } = await postgrestSelectMaybeOne(
    supabaseUrl,
    serviceKey,
    "phone_otp_challenges",
    "phone",
    parsed.e164,
    "code_hash,expires_at"
  );

  if (fetchErr || !row) {
    return NextResponse.json({ error: "No OTP found. Request a new code." }, { status: 400 });
  }

  if (new Date(row.expires_at as string).getTime() < Date.now()) {
    await postgrestDeleteEq(supabaseUrl, serviceKey, "phone_otp_challenges", "phone", parsed.e164);
    return NextResponse.json({ error: "OTP expired. Request a new code." }, { status: 400 });
  }

  const expectedHash = hashPhoneOtp(parsed.e164, otpRaw, secret);
  const a = Buffer.from(expectedHash, "utf8");
  const b = Buffer.from(row.code_hash as string, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
  }

  await postgrestDeleteEq(supabaseUrl, serviceKey, "phone_otp_challenges", "phone", parsed.e164);

  const email = syntheticEmailForPhone(parsed.digits10);
  const password = useSignupPassword
    ? rawPassword
    : createHash("sha256").update(randomBytes(32)).digest("hex") + randomBytes(8).toString("hex");

  const createRes = await authServiceRolePost(supabaseUrl, serviceKey, "/auth/v1/admin/users", {
    email,
    phone: parsed.e164,
    email_confirm: true,
    phone_confirm: true,
    password,
  });

  if (createRes.statusCode < 200 || createRes.statusCode >= 300) {
    const msg = authErrorMessage(createRes.body);
    if (isDuplicateUserError(msg)) {
      if (useSignupPassword) {
        return NextResponse.json(
          { error: "An account with this mobile number already exists. Sign in instead." },
          { status: 409 }
        );
      }
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
