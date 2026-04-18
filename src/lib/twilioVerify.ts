/**
 * Minimal Twilio Verify v2 client using the REST API directly.
 * Docs: https://www.twilio.com/docs/verify/api/verification
 *
 * We avoid the official `twilio` npm package here to keep the serverless bundle
 * small; we just need two endpoints: POST /Verifications and POST /VerificationCheck.
 */

export interface TwilioVerifyResult {
  ok: boolean;
  status?: string;
  error?: string;
  errorCode?: string | number;
}

const BASE = "https://verify.twilio.com/v2";

function getCreds(): { sid: string; token: string; verifyServiceSid: string } | null {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim();
  if (!sid || !token || !verifyServiceSid) return null;
  return { sid, token, verifyServiceSid };
}

function basicAuthHeader(sid: string, token: string): string {
  return "Basic " + Buffer.from(`${sid}:${token}`).toString("base64");
}

/** Start an SMS verification (send a 6-digit code to `phone` in E.164 format). */
export async function twilioStartSmsVerify(phone: string): Promise<TwilioVerifyResult> {
  const creds = getCreds();
  if (!creds) return { ok: false, error: "Twilio not configured" };

  const body = new URLSearchParams({ To: phone, Channel: "sms" });
  try {
    const res = await fetch(`${BASE}/Services/${creds.verifyServiceSid}/Verifications`, {
      method: "POST",
      headers: {
        Authorization: basicAuthHeader(creds.sid, creds.token),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
      cache: "no-store",
    });
    const text = await res.text();
    const json = safeJson(text) as { status?: string; message?: string; code?: number };
    if (!res.ok) {
      return { ok: false, error: json.message || text || `Twilio ${res.status}`, errorCode: json.code };
    }
    return { ok: true, status: json.status };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Twilio network error" };
  }
}

/** Check a previously sent code. Returns ok:true when `status === "approved"`. */
export async function twilioCheckSmsVerify(phone: string, code: string): Promise<TwilioVerifyResult> {
  const creds = getCreds();
  if (!creds) return { ok: false, error: "Twilio not configured" };

  const body = new URLSearchParams({ To: phone, Code: code });
  try {
    const res = await fetch(`${BASE}/Services/${creds.verifyServiceSid}/VerificationCheck`, {
      method: "POST",
      headers: {
        Authorization: basicAuthHeader(creds.sid, creds.token),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
      cache: "no-store",
    });
    const text = await res.text();
    const json = safeJson(text) as { status?: string; message?: string; code?: number };
    if (!res.ok) {
      return { ok: false, error: json.message || text || `Twilio ${res.status}`, errorCode: json.code };
    }
    if (json.status !== "approved") {
      return { ok: false, status: json.status, error: "Invalid OTP" };
    }
    return { ok: true, status: json.status };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Twilio network error" };
  }
}

function safeJson(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}
