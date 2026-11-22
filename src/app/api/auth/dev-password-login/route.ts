import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { normalizeIndianPhone } from "@/lib/phoneAuth";
import { findAuthUserByPhone } from "@/lib/server/authUsers";
import { issueMagicLinkSession } from "@/lib/server/issueMagicLinkSession";

/**
 * LOCAL DEVELOPMENT ONLY: password login for one configured account without
 * touching its real password in the database.
 *
 * Enabled only when ALL are true:
 *   - NODE_ENV !== "production"  (never on Vercel Test/Prod builds)
 *   - DEV_LOGIN_PHONE and DEV_LOGIN_PASSWORD are set (in .env.local)
 * Otherwise responds 404 and the client falls back to normal password login.
 */
export async function POST(req: NextRequest) {
  const phoneSetting = (process.env.DEV_LOGIN_PHONE || "").replace(/\D/g, "").slice(-10);
  const passwordSetting = process.env.DEV_LOGIN_PASSWORD || "";
  if (process.env.NODE_ENV === "production" || !phoneSetting || !passwordSetting) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as { phone?: string; password?: string };
  const parsed = normalizeIndianPhone(body.phone || "");
  if (!parsed || parsed.digits10 !== phoneSetting || body.password !== passwordSetting) {
    // Not the configured dev account: let the normal login path handle it.
    return NextResponse.json({ error: "Not a dev login" }, { status: 404 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const user = await findAuthUserByPhone(createSupabaseAdmin(), parsed.e164, parsed.digits10);
  if (!user?.email) {
    return NextResponse.json({ error: "No account found for the dev login phone" }, { status: 404 });
  }
  const session = await issueMagicLinkSession(supabaseUrl, serviceKey, user.email);
  if (!session.ok) return NextResponse.json({ error: session.error }, { status: session.status });
  return NextResponse.json({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
}
