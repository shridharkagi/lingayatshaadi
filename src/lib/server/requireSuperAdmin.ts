import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";

/** Last 10 digits (India) or full digits used with `endsWith` on normalized `user.phone`. */
const SUPER_ADMIN_PHONE = (process.env.SUPER_ADMIN_PHONE || "9844497002").replace(/\D/g, "");

/** Comma-separated extra emails that always pass the superadmin gate (e.g. shridhar.kagi@gmail.com). */
function superAdminEmailAllowlist(): string[] {
  const raw = process.env.SUPER_ADMIN_EMAILS || process.env.SUPER_ADMIN_EMAIL || "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

type SuperAdminAuthResult =
  | { ok: true; userId: string }
  | { ok: false; status: number; error: string };

export async function requireSuperAdmin(req: NextRequest): Promise<SuperAdminAuthResult> {
  const authHeader = req.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return { ok: false, status: 401, error: "Missing Authorization: Bearer <token>" };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return { ok: false, status: 500, error: "Supabase env not configured" };
  }

  const anonClient = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await anonClient.auth.getUser(match[1]);
  if (userErr || !userData.user) {
    return { ok: false, status: 401, error: userErr?.message || "Invalid token" };
  }
  const user = userData.user;

  const phoneDigits = (user.phone || "").replace(/\D/g, "");
  const isPhoneAdmin = !!phoneDigits && phoneDigits.endsWith(SUPER_ADMIN_PHONE);
  const email = (user.email || "").toLowerCase();
  const syntheticAdminEmail = `phone_${SUPER_ADMIN_PHONE}@phone.otp.lingayatshaadi`;
  const isSyntheticPhoneEmail = email === syntheticAdminEmail;
  const isLegacyEmailContainsPhone = email.includes(SUPER_ADMIN_PHONE);
  const isAllowlistedEmail = superAdminEmailAllowlist().includes(email);
  const isEmailAdmin = isSyntheticPhoneEmail || isLegacyEmailContainsPhone || isAllowlistedEmail;

  if (isPhoneAdmin || isEmailAdmin) return { ok: true, userId: user.id };

  try {
    const admin = createSupabaseAdmin();
    const { data: prof } = await admin
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "superadmin")
      .limit(1)
      .maybeSingle();
    if (prof) return { ok: true, userId: user.id };
  } catch {
    // Treat any lookup issue as forbidden.
  }

  return { ok: false, status: 403, error: "Forbidden: super admin only" };
}
