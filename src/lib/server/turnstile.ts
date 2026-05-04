import { NextResponse, type NextRequest } from "next/server";

/**
 * Cloudflare Turnstile — server-side verification + enforcement helper.
 *
 * Reads:
 *   - TURNSTILE_SECRET_KEY  (required when not disabled / bypassed)
 *   - TURNSTILE_MODE        "enforce" (default) | "shadow" | "disabled"
 *   - CAPTCHA_BYPASS        "true" disables verification entirely
 *
 * Modes:
 *   - enforce  — reject requests with missing / invalid tokens (403)
 *   - shadow   — verify and log, but always allow the request through
 *   - disabled — skip verification entirely
 *
 * Why a separate file: keeps the secret key out of any module that might also
 * be imported in client code, and centralises the failure-mode policy so every
 * future caller (login, signup, password reset) gets the same guarantees.
 */

export type TurnstileMode = "enforce" | "shadow" | "disabled";

export type TurnstileVerifyResult =
  | { ok: true; mode: TurnstileMode; bypassed: boolean }
  | {
      ok: false;
      mode: TurnstileMode;
      bypassed: boolean;
      reason:
        | "missing_token"
        | "missing_secret"
        | "siteverify_error"
        | "rejected"
        | "exception";
      detail?: string;
      errorCodes?: string[];
    };

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const VERIFY_TIMEOUT_MS = 10000;

function envBool(name: string, def = false): boolean {
  const raw = (process.env[name] ?? "").trim().toLowerCase();
  if (!raw) return def;
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

export function isCaptchaBypassed(): boolean {
  return envBool("CAPTCHA_BYPASS", false);
}

export function getTurnstileMode(): TurnstileMode {
  const raw = (process.env.TURNSTILE_MODE ?? "").trim().toLowerCase();
  if (raw === "shadow" || raw === "disabled") return raw;
  return "enforce";
}

function getClientIp(req: NextRequest): string | undefined {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return undefined;
}

async function callSiteVerify(
  token: string,
  secret: string,
  remoteIp?: string
): Promise<{
  success: boolean;
  errorCodes?: string[];
  raw?: unknown;
  transportError?: string;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);
  try {
    const form = new URLSearchParams();
    form.set("secret", secret);
    form.set("response", token);
    if (remoteIp) form.set("remoteip", remoteIp);

    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      signal: controller.signal,
    });
    if (!res.ok) {
      return {
        success: false,
        transportError: `siteverify ${res.status}`,
      };
    }
    const json = (await res.json()) as {
      success?: boolean;
      "error-codes"?: string[];
    };
    return {
      success: !!json.success,
      errorCodes: json["error-codes"],
      raw: json,
    };
  } catch (e) {
    return {
      success: false,
      transportError: e instanceof Error ? e.message : String(e),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function callSiteVerifyWithRetry(
  token: string,
  secret: string,
  remoteIp?: string
): Promise<{
  success: boolean;
  errorCodes?: string[];
  raw?: unknown;
  transportError?: string;
}> {
  const first = await callSiteVerify(token, secret, remoteIp);
  if (first.success) return first;
  // Retry once on transport-level instability (timeouts / 5xx / DNS hiccups).
  if (!first.transportError) return first;
  await new Promise((r) => setTimeout(r, 350));
  return callSiteVerify(token, secret, remoteIp);
}

/**
 * Verify a Turnstile token. Honors mode and bypass. Never throws.
 *
 * Callers that want to short-circuit the request should use the higher-level
 * `requireTurnstileForRequest` helper below instead of inspecting the result.
 */
export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string
): Promise<TurnstileVerifyResult> {
  const mode = getTurnstileMode();
  const bypassed = isCaptchaBypassed();

  if (bypassed) {
    return { ok: true, mode, bypassed: true };
  }
  if (mode === "disabled") {
    return { ok: true, mode, bypassed: false };
  }

  const trimmed = (token ?? "").trim();
  if (!trimmed) {
    return {
      ok: false,
      mode,
      bypassed: false,
      reason: "missing_token",
    };
  }

  const secret = (process.env.TURNSTILE_SECRET_KEY ?? "").trim();
  if (!secret) {
    return {
      ok: false,
      mode,
      bypassed: false,
      reason: "missing_secret",
      detail: "TURNSTILE_SECRET_KEY is not set on the server",
    };
  }

  const verify = await callSiteVerifyWithRetry(trimmed, secret, remoteIp);
  if (verify.success) {
    return { ok: true, mode, bypassed: false };
  }
  if (verify.transportError) {
    return {
      ok: false,
      mode,
      bypassed: false,
      reason: "siteverify_error",
      detail: verify.transportError,
    };
  }
  return {
    ok: false,
    mode,
    bypassed: false,
    reason: "rejected",
    errorCodes: verify.errorCodes,
  };
}

/**
 * Higher-level helper: extract the token from a request body, verify it, and
 * return either:
 *   - null  → caller may proceed
 *   - NextResponse → caller MUST return this immediately (client got a 403)
 *
 * In `shadow` mode, failures are logged but null is always returned.
 * In `enforce` mode, failures return a 403 NextResponse.
 *
 * The `body` argument is the already-parsed request JSON. Callers should pass
 * the same body they use elsewhere — we just look up `turnstileToken`.
 */
export async function requireTurnstileForRequest(
  request: NextRequest,
  body: unknown,
  context: { route: string }
): Promise<NextResponse | null> {
  const token =
    typeof body === "object" && body !== null && "turnstileToken" in body
      ? (body as { turnstileToken?: unknown }).turnstileToken
      : undefined;
  const tokenStr = typeof token === "string" ? token : undefined;

  const remoteIp = getClientIp(request);
  const result = await verifyTurnstileToken(tokenStr, remoteIp);

  if (result.ok) {
    return null;
  }

  // Always log failures so we can spot misconfig and abuse patterns.
  const ipForLog = remoteIp || "?";
  const codes = result.errorCodes?.join(",") || "-";
  console.warn(
    `[turnstile] ${context.route} mode=${result.mode} reason=${result.reason} ip=${ipForLog} codes=${codes}${
      result.detail ? ` detail=${result.detail}` : ""
    }`
  );

  if (result.mode === "shadow") {
    // Record but do not reject.
    return null;
  }

  // enforce mode: reject. Use 403 so it's distinguishable from 4xx auth errors.
  // Friendly message; do NOT leak the exact reason/codes to the client (they'd
  // help an attacker probe the verification logic).
  return NextResponse.json(
    {
      error:
        "Verification failed. Refresh the page and try again — if this keeps happening, contact support.",
      captcha: "failed",
    },
    { status: 403 }
  );
}
