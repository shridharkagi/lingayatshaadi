/**
 * Resolves which OTP delivery channel to use, based on env vars. Priority:
 *   1. DEV_OTP_BYPASS=true  → no SMS sent; any 6-digit code accepted (dev only).
 *   2. FAST2SMS_API_KEY set → real SMS via Fast2SMS (DLT).
 */

export type OtpChannel = "bypass" | "fast2sms" | "none";

export type OtpPurpose = "login" | "signup" | "password_reset";

export function resolveOtpChannel(): OtpChannel {
  if (String(process.env.DEV_OTP_BYPASS || "").toLowerCase() === "true") {
    return "bypass";
  }
  const apiKey = process.env.FAST2SMS_API_KEY?.trim();
  if (apiKey) return "fast2sms";
  return "none";
}

/** Map a purpose to the configured Fast2SMS DLT template ID (env). */
export function fast2smsTemplateIdFor(purpose: OtpPurpose): string | null {
  const map: Record<OtpPurpose, string | undefined> = {
    login: process.env.FAST2SMS_TEMPLATE_ID_LOGIN?.trim(),
    signup: process.env.FAST2SMS_TEMPLATE_ID_SIGNUP?.trim(),
    password_reset: process.env.FAST2SMS_TEMPLATE_ID_PASSWORD_RESET?.trim(),
  };
  return map[purpose] || null;
}

/**
 * Returns the exact SMS body we send through Fast2SMS for each purpose.
 * IMPORTANT: The text must match the DLT-approved template word-for-word
 * (only the {otp} placeholder differs). Any divergence causes Fast2SMS to
 * reject the SMS with "Invalid Message ID (or Template, Entity ID)".
 */
export function fast2smsMessageFor(purpose: OtpPurpose, otp: string): string {
  switch (purpose) {
    case "login":
      return `Your LingayatShaadi OTP for login verification is ${otp}. Valid for 10 minutes. Do not share it.`;
    case "signup":
      return `Your LingayatShaadi OTP for account verification is ${otp}. Valid for 10 minutes. Do not share it.`;
    case "password_reset":
      return `Your LingayatShaadi OTP for password reset is ${otp}. Valid for 10 minutes. Do not share it.`;
  }
}

export function normalizePurpose(raw: unknown): OtpPurpose {
  if (raw === "signup" || raw === "password_reset" || raw === "login") return raw;
  return "login";
}
