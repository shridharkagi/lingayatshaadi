"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Script from "next/script";
import {
  TURNSTILE_SCRIPT_SRC,
  getTurnstileSiteKey,
  isTurnstileClientConfigured,
} from "@/lib/turnstileConfig";

/**
 * Cloudflare Turnstile — managed widget mounted once at the app root.
 *
 * Why a single hidden widget instead of one per form:
 *   - With appearance="interaction-only" + execution="execute" the widget is
 *     hidden by default and only renders a challenge UI if Cloudflare needs
 *     user interaction. We render it once, then call execute() right before
 *     the network request that needs a token. That gives every form a fresh,
 *     unused token (Cloudflare rejects reused tokens) without each form caring
 *     about widget lifecycle.
 *   - Tokens are valid ~5 min, so acquiring at submit time avoids the trap of
 *     a token expiring while the user fills the form.
 *
 * Server contract:
 *   The browser POSTs `turnstileToken` in the request body. The server uses
 *   `requireTurnstileForRequest` (see lib/server/turnstile.ts) to honor
 *   TURNSTILE_MODE / CAPTCHA_BYPASS.
 */

interface TurnstileRenderOpts {
  sitekey: string;
  // Cloudflare deprecated "invisible" as a size value. Only these three are
  // accepted by the current SDK. We rely on appearance/execution to keep the
  // widget hidden (see render call below).
  size?: "normal" | "compact" | "flexible";
  appearance?: "always" | "execute" | "interaction-only";
  execution?: "render" | "execute";
  callback?: (token: string) => void;
  "error-callback"?: (errorCode: string) => void;
  "expired-callback"?: () => void;
  "timeout-callback"?: () => void;
}

interface TurnstileGlobal {
  render: (
    container: HTMLElement | string,
    opts: TurnstileRenderOpts
  ) => string;
  execute: (widgetIdOrContainer: string | HTMLElement, opts?: { action?: string }) => void;
  reset: (widgetIdOrContainer: string | HTMLElement) => void;
  remove: (widgetId: string) => void;
  ready: (cb: () => void) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileGlobal;
  }
}

interface TurnstileContextValue {
  /**
   * Acquire a fresh Turnstile token. Resolves with an empty string when
   * Turnstile is not configured (the server will then decide based on mode).
   * Rejects with an Error if the widget loaded but the user/network failed
   * the challenge — callers should treat that as a verification failure.
   */
  getToken: () => Promise<string>;
  /**
   * Hint that a token will likely be needed soon — auth forms call this on
   * mount or on first input so Cloudflare's challenge runs in parallel with
   * the user typing instead of blocking the submit click. Idempotent and
   * safe to call repeatedly; if a primed token is already in flight or
   * fresh, it's a no-op.
   */
  prime: () => void;
  /** True when the widget is mounted and ready to execute. */
  ready: boolean;
}

const TurnstileContext = createContext<TurnstileContextValue | null>(null);

// Keep submit latency tight: wait briefly for widget bootstrap, then proceed.
// (Challenge execution timeout remains higher below.)
/** Mobile / LTE often needs longer than desktop for api.js + widget bootstrap */
const WIDGET_READY_WAIT_MS = 8000;
const CHALLENGE_WAIT_MS = 22000;
// Cloudflare tokens are valid ~5 min. Keep our cache shorter so a primed
// token never arrives at Supabase already-expired.
const PRIMED_TOKEN_TTL_MS = 4 * 60 * 1000;

export function TurnstileProvider({ children }: { children: ReactNode }) {
  const enabled = isTurnstileClientConfigured();
  const sitekey = getTurnstileSiteKey();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const pendingResolveRef = useRef<((token: string) => void) | null>(null);
  const pendingRejectRef = useRef<((err: Error) => void) | null>(null);
  // Primed token state — populated by prime() so getToken() can return
  // immediately on the first call after a form mount. Single-use; cleared
  // the moment getToken() consumes it.
  const primedPromiseRef = useRef<Promise<string> | null>(null);
  const primedTokenRef = useRef<{ token: string; expiresAt: number } | null>(null);
  const [ready, setReady] = useState(false);

  const settle = useCallback(
    (kind: "resolve" | "reject", value: string | Error) => {
      const resolve = pendingResolveRef.current;
      const reject = pendingRejectRef.current;
      pendingResolveRef.current = null;
      pendingRejectRef.current = null;
      if (kind === "resolve" && resolve && typeof value === "string") resolve(value);
      else if (kind === "reject" && reject && value instanceof Error) reject(value);
    },
    []
  );

  const tryInitWidget = useCallback(() => {
    if (!enabled) return;
    if (widgetIdRef.current) return;
    if (typeof window === "undefined") return;
    if (!containerRef.current) return;
    const turnstile = window.turnstile;
    if (!turnstile) return;

    try {
      widgetIdRef.current = turnstile.render(containerRef.current, {
        sitekey,
        // Modern equivalent of "invisible": run only on demand and only show
        // a challenge UI if Cloudflare actually needs user interaction.
        appearance: "interaction-only",
        execution: "execute",
        callback: (token: string) => settle("resolve", token),
        "error-callback": (errorCode: string) => {
          settle("reject", new Error(`turnstile error: ${errorCode || "unknown"}`));
        },
        "expired-callback": () => {
          // Token expired before use. Next getToken() resets+executes again.
          if (widgetIdRef.current && window.turnstile) {
            try {
              window.turnstile.reset(widgetIdRef.current);
            } catch {
              /* ignore */
            }
          }
        },
        "timeout-callback": () => {
          settle("reject", new Error("turnstile timeout"));
        },
      });
      setReady(true);
    } catch (e) {
      console.warn("[turnstile] widget render failed:", e);
    }
  }, [enabled, settle, sitekey]);

  // Cover the case where the script is already loaded (e.g. client-side nav)
  // by polling briefly for window.turnstile in addition to Script.onLoad.
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    if (window.turnstile) {
      tryInitWidget();
      return;
    }
    const start = Date.now();
    const id = window.setInterval(() => {
      if (window.turnstile) {
        tryInitWidget();
        window.clearInterval(id);
      } else if (Date.now() - start > WIDGET_READY_WAIT_MS) {
        window.clearInterval(id);
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [enabled, tryInitWidget]);

  /** Run the actual Cloudflare challenge and resolve with the resulting token. */
  const fetchFreshToken = useCallback(async (): Promise<string> => {
    if (!enabled) return "";
    if (typeof window === "undefined") return "";

    // Wait for the widget to mount in case getToken is called before the
    // script loaded (slow phone network, immediate form submit, etc.).
    const start = Date.now();
    while (!widgetIdRef.current && Date.now() - start < WIDGET_READY_WAIT_MS) {
      tryInitWidget();
      await new Promise((r) => setTimeout(r, 150));
    }

    const widgetId = widgetIdRef.current;
    const turnstile = window.turnstile;
    if (!widgetId || !turnstile) {
      // Widget never loaded — return empty token. The server decides based on
      // TURNSTILE_MODE (enforce → 403, shadow → log + pass).
      console.warn("[turnstile] widget not ready; sending request without token");
      return "";
    }

    return new Promise<string>((resolve, reject) => {
      let settled = false;
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        pendingResolveRef.current = null;
        pendingRejectRef.current = null;
        fn();
      };

      pendingResolveRef.current = (t) => finish(() => resolve(t));
      pendingRejectRef.current = (e) => finish(() => reject(e));

      try {
        turnstile.reset(widgetId);
        turnstile.execute(widgetId);
      } catch (e) {
        finish(() =>
          reject(
            new Error(
              `turnstile execute failed: ${e instanceof Error ? e.message : String(e)}`
            )
          )
        );
        return;
      }

      window.setTimeout(() => {
        finish(() => reject(new Error("turnstile timeout")));
      }, CHALLENGE_WAIT_MS);
    });
  }, [enabled, tryInitWidget]);

  const prime = useCallback(() => {
    if (!enabled) return;
    // Already have a fresh primed token — don't waste a Cloudflare call.
    const cached = primedTokenRef.current;
    if (cached && cached.expiresAt > Date.now()) return;
    // Already primed and the request is in flight — let it complete.
    if (primedPromiseRef.current) return;

    const p = fetchFreshToken()
      .then((token) => {
        if (token) {
          primedTokenRef.current = {
            token,
            expiresAt: Date.now() + PRIMED_TOKEN_TTL_MS,
          };
        }
        return token;
      })
      .catch((err) => {
        // Swallow — getToken() will retry inline and surface the real error.
        console.warn("[turnstile] prime failed:", err instanceof Error ? err.message : err);
        return "";
      })
      .finally(() => {
        primedPromiseRef.current = null;
      });
    primedPromiseRef.current = p;
  }, [enabled, fetchFreshToken]);

  const getToken = useCallback(async (): Promise<string> => {
    if (!enabled) return "";

    // Fast path: a primed token is sitting ready. Consume and return.
    const cached = primedTokenRef.current;
    if (cached && cached.expiresAt > Date.now()) {
      primedTokenRef.current = null;
      return cached.token;
    }

    // A prime() call is in flight — await it instead of issuing a parallel
    // execute() (Cloudflare rejects concurrent challenges on one widget).
    const inflight = primedPromiseRef.current;
    if (inflight) {
      const token = await inflight;
      // Whether prime succeeded or failed, the cache is now drained.
      const fresh = primedTokenRef.current;
      if (fresh) {
        primedTokenRef.current = null;
        return fresh.token;
      }
      if (token) return token;
      // prime resolved with empty (e.g. widget not ready) — fall through.
    }

    return fetchFreshToken();
  }, [enabled, fetchFreshToken]);

  if (!enabled) {
    return (
      <TurnstileContext.Provider
        value={{ getToken: async () => "", prime: () => {}, ready: false }}
      >
        {children}
      </TurnstileContext.Provider>
    );
  }

  return (
    <TurnstileContext.Provider value={{ getToken, prime, ready }}>
      <Script
        src={TURNSTILE_SCRIPT_SRC}
        strategy="afterInteractive"
        onLoad={tryInitWidget}
        onReady={tryInitWidget}
      />
      <div
        ref={containerRef}
        aria-hidden
        style={{
          position: "fixed",
          left: 0,
          bottom: 0,
          width: 1,
          height: 1,
          opacity: 0,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      />
      {children}
    </TurnstileContext.Provider>
  );
}

export function useTurnstile(): TurnstileContextValue {
  const ctx = useContext(TurnstileContext);
  if (!ctx) {
    // No provider in tree — degrade gracefully. The server will decide what
    // to do with the empty token based on its mode.
    return { getToken: async () => "", prime: () => {}, ready: false };
  }
  return ctx;
}
