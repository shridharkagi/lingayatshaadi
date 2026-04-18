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
  return `phone_${digits10}@phone.otp.lingayatshaadi`;
}

export function hashPhoneOtp(phoneE164: string, otp: string, secret: string): string {
  return createHash("sha256")
    .update(`${secret}|${phoneE164}|${otp}`, "utf8")
    .digest("hex");
}
