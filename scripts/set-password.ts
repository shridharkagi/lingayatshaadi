/**
 * One-shot script: set / reset a user's password by phone number.
 *
 * Uses the Supabase Admin API (service role key) to find the auth user whose
 * phone matches and update the password. Supabase stores passwords as bcrypt
 * hashes — never `UPDATE auth.users SET encrypted_password = ...` directly.
 *
 * Usage:
 *   npm run set-password -- <10-digit-phone> <new-password>
 *
 * Examples:
 *   npm run set-password -- 9844497002 9844497002
 *   npm run set-password -- 9844497002 'My$ecret123'
 *
 * Requires (already in .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
      "Run via:  npm run set-password -- 9844497002 9844497002"
  );
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error(
    "Usage: npm run set-password -- <10-digit-phone> <new-password>\n" +
      "  e.g. npm run set-password -- 9844497002 9844497002"
  );
  process.exit(1);
}

const rawPhone = args[0].replace(/\D/g, "");
const newPassword = args[1];

if (rawPhone.length !== 10) {
  console.error(`Phone must be 10 digits, got "${args[0]}".`);
  process.exit(1);
}
if (!newPassword || newPassword.length < 6) {
  console.error("Password must be at least 6 characters.");
  process.exit(1);
}

const phoneE164NoPlus = `91${rawPhone}`; // Supabase stores phone as digits w/o '+'
const phoneE164 = `+91${rawPhone}`;
const syntheticEmail = `phone_${rawPhone}@phone.otp.lingayatshaadi`;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserId(): Promise<string | null> {
  // Page through users; auth.admin.listUsers caps at 1000/page.
  let page = 1;
  const perPage = 1000;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error("listUsers failed:", error.message);
      return null;
    }
    const match = data.users.find((u) => {
      const p = (u.phone || "").replace(/\D/g, "");
      const e = (u.email || "").toLowerCase();
      return (
        p === phoneE164NoPlus ||
        p === rawPhone ||
        e === syntheticEmail.toLowerCase() ||
        e.includes(rawPhone)
      );
    });
    if (match) return match.id;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function main() {
  console.log(`Looking up user for phone ${phoneE164} / email ${syntheticEmail} ...`);
  const userId = await findUserId();
  if (!userId) {
    console.error(
      `No auth.users row found for ${phoneE164}. ` +
        "Sign up first (any 6-digit OTP works while DEV_OTP_BYPASS=true)."
    );
    process.exit(2);
  }
  console.log(`Found user id: ${userId}. Updating password ...`);

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    password: newPassword,
  });
  if (error) {
    console.error("updateUserById (password only) failed:", error.message);
    process.exit(3);
  }
  console.log(`OK. Password updated for user ${userId}.`);
  console.log(
    "Note: this account is signed in by phone-OTP via the synthetic email " +
      `${syntheticEmail}. Sign in via Login → Password tab using mobile ${rawPhone}.`
  );
}

main().catch((e) => {
  console.error("Unexpected error:", e);
  process.exit(99);
});
