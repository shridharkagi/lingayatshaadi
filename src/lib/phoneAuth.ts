import { createHash } from "crypto";

/** E.164 for India: +91 + 10 digits */
export function normalizeIndianPhone(input: string): { e164: string; digits10: string } | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    const rest = digits.slice(2);
    if (rest.length === 10) return { e164: `+91${rest}`, digits10: rest };
  }
  if (digits.length === 10) {
    return { e164: `+91${digits}`, digits10: digits };
  }
  return null;
}

/** Deterministic placeholder email for Supabase Auth (phone-only login). Not used for delivery. */
export function syntheticEmailForPhone(digits10: string): string {
  return `phone_${digits10}@phone.otp.lingayatbandhu.com`;
}

const SYNTHETIC_EMAIL_RE = /^phone_\d+@phone\.otp\.(?:lingayatbandhu(?:\.com)?|lingayatshaadi(?:\.in)?)$/i;

/**
 * Backward compatibility for older accounts created before the synthetic
 * email domain gained a valid TLD. Sign-in should try both.
 */
export function syntheticEmailCandidatesForPhone(digits10: string): string[] {
  const next = syntheticEmailForPhone(digits10);
  // Keep legacy candidates so existing users created before rebrand can still sign in.
  const legacyBandhuNoTld = `phone_${digits10}@phone.otp.lingayatbandhu`;
  const legacyShaadiWithTld = `phone_${digits10}@phone.otp.lingayatshaadi.in`;
  const legacyShaadiNoTld = `phone_${digits10}@phone.otp.lingayatshaadi`;
  return [next, legacyBandhuNoTld, legacyShaadiWithTld, legacyShaadiNoTld];
}

/** True when this is our internal phone-placeholder row (hide in UI; not a customer email). */
export function isSyntheticAuthEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== "string") return false;
  return SYNTHETIC_EMAIL_RE.test(email.trim());
}

export function hashPhoneOtp(phoneE164: string, otp: string, secret: string): string {
  return createHash("sha256")
    .update(`${secret}|${phoneE164}|${otp}`, "utf8")
    .digest("hex");
}
