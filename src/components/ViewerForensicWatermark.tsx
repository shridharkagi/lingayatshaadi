"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { adminFetch } from "@/lib/api/adminClient";

/** Fewer, wider-spaced tiles (3×3) so the page stays readable; forensic id still repeats across the viewport. */
const TILE_LAYOUT: { top: string; left: string }[] = (() => {
  const out: { top: string; left: string }[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      out.push({
        top: `${10 + row * 40}%`,
        left: `${8 + col * 42}%`,
      });
    }
  }
  return out;
})();

const WATERMARK_SITE_LINE = "www.lingayatbandhu.com";

export interface ViewerForensicWatermarkProps {
  /** When false, nothing is rendered. */
  active?: boolean;
  /** Repeating diagonal labels across the viewport (default true). */
  tiled?: boolean;
}

/**
 * Forensic overlay: site URL + account code (U…) + local time (two lines).
 * Use on pages that show other members' sensitive listing or profile data.
 */
export function ViewerForensicWatermark({ active = true, tiled = true }: ViewerForensicWatermarkProps) {
  const { isLoggedIn } = useAuth();
  const [accountCode, setAccountCode] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn || !active) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await adminFetch("/api/account/account-code");
        const json = (await res.json()) as { accountCode?: string | null; error?: string };
        if (!cancelled && json.accountCode) setAccountCode(json.accountCode);
      } catch {
        if (!cancelled) setAccountCode(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, active]);

  const timeStr = useMemo(
    () =>
      new Date().toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    []
  );

  if (!active || !isLoggedIn) return null;

  /** Placeholder until the fast single-user API returns (avoid blank watermark on load). */
  const secondLine =
    accountCode != null && accountCode !== ""
      ? `${accountCode} · ${timeStr}`
      : `— · ${timeStr}`;

  return (
    <>
      {tiled && (
        <div
          className="pointer-events-none fixed inset-0 z-[21] overflow-hidden max-w-[100vw]"
          aria-hidden
        >
          {TILE_LAYOUT.map((pos, i) => (
            <span
              key={i}
              className="absolute inline-flex flex-col gap-0 text-[9px] sm:text-[10px] font-medium text-gray-700/[0.16] dark:text-gray-300/[0.2] select-none -rotate-[17deg] tracking-tight leading-tight"
              style={{ top: pos.top, left: pos.left }}
            >
              <span className="whitespace-nowrap">{WATERMARK_SITE_LINE}</span>
              <span className="whitespace-nowrap">{secondLine}</span>
            </span>
          ))}
        </div>
      )}
      <div
        className="pointer-events-none fixed bottom-0 left-0 right-0 z-[23] px-2 py-1.5 sm:py-2 bg-black/45 text-white/88 text-[10px] sm:text-[11px] text-center font-medium leading-snug max-w-[100vw] backdrop-blur-[2px]"
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col items-center gap-0.5">
          <span>{WATERMARK_SITE_LINE}</span>
          <span>{secondLine}</span>
        </div>
      </div>
    </>
  );
}
