/**
 * Fast2SMS DLT SMS client — uses the `dlt_manual` route so we can pass the
 * DLT Content Template ID directly (the 19-digit ID issued by the DLT
 * operator) along with the fully-rendered message text. This avoids having
 * to fetch Fast2SMS's internal short "message id" for each approved template.
 *
 * Docs:
 *   - https://docs.fast2sms.com/reference/dlt-sms
 *   - https://docs.fast2sms.com/reference/authorization
 */

const BASE_URL = "https://www.fast2sms.com/dev/bulkV2";

export interface Fast2SmsSendResult {
  ok: boolean;
  /** Fast2SMS request ID (for DLR lookups / support tickets). */
  requestId?: string;
  /** Raw provider status message. */
  message?: string;
  error?: string;
  httpStatus?: number;
}

interface SendOpts {
  apiKey: string;
  senderId: string;
  /** 19-digit DLT Content Template ID. */
  templateId: string;
  /** Fully-rendered SMS body (OTP already substituted). Must match the DLT-approved template text. */
  messageText: string;
  /** 10-digit Indian mobile (no country code). */
  numbers: string;
}

/** Send a DLT-registered OTP SMS via Fast2SMS (route=dlt_manual). */
export async function fast2smsSendDltOtp(opts: SendOpts): Promise<Fast2SmsSendResult> {
  const { apiKey, senderId, templateId, messageText, numbers } = opts;

  // Fast2SMS GET endpoints require `authorization` as a query parameter
  // (https://docs.fast2sms.com/reference/authorization). Header is sent
  // too for defence-in-depth — both are accepted.
  const params = new URLSearchParams({
    authorization: apiKey,
    route: "dlt_manual",
    sender_id: senderId,
    template_id: templateId,
    message: messageText,
    flash: "0",
    numbers,
  });

  try {
    const res = await fetch(`${BASE_URL}?${params.toString()}`, {
      method: "GET",
      headers: {
        authorization: apiKey,
        "cache-control": "no-cache",
      },
      cache: "no-store",
    });
    const text = await res.text();
    const json = safeJson(text) as {
      return?: boolean;
      request_id?: string;
      message?: string | string[];
      status_code?: number;
    };

    const messageStr = Array.isArray(json.message) ? json.message.join("; ") : json.message;

    if (!res.ok || json.return === false) {
      return {
        ok: false,
        httpStatus: res.status,
        requestId: json.request_id,
        message: messageStr,
        error: messageStr || `Fast2SMS HTTP ${res.status}`,
      };
    }

    return {
      ok: true,
      httpStatus: res.status,
      requestId: json.request_id,
      message: messageStr,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Fast2SMS network error",
    };
  }
}

function safeJson(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}
