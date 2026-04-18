/**
 * Resolves which OTP delivery channel to use, based on env vars. Priority:
 *   1. DEV_OTP_BYPASS=true    → no SMS sent; any 6-digit code accepted.
 *   2. TWILIO_*  set          → real SMS via Twilio Verify.
 *   3. APIHOME_SMS_KEY set    → legacy API HOME gateway path.
 */

export type OtpChannel = "bypass" | "twilio" | "apihome" | "none";

export function resolveOtpChannel(): OtpChannel {
  if (String(process.env.DEV_OTP_BYPASS || "").toLowerCase() === "true") {
    return "bypass";
  }
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim();
  if (sid && token && verifySid) return "twilio";
  const apihome = process.env.APIHOME_SMS_KEY?.trim();
  if (apihome) return "apihome";
  return "none";
}
