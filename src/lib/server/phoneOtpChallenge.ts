import { timingSafeEqual } from "crypto";
import {
  postgrestDeleteEq,
  postgrestSelectMaybeOne,
} from "@/lib/postgrestServer";
import { hashPhoneOtp } from "@/lib/phoneAuth";

/** Returns null on success, or an error message string. */
export async function verifyPhoneOtpChallenge(
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
