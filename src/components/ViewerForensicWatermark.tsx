"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { adminFetch } from "@/lib/api/adminClient";

const TILE_LAYOUT: { top: string; left: string }[] = (() => {
  const out: { top: string; left: string }[] = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      out.push({ top: `${6 + row * 19}%`, left: `${1 + col * 20}%` });
    }
  }
  return out;
})();

export interface ViewerForensicWatermarkProps {
  /** When false, nothing is rendered. */
  active?: boolean;
  /** Repeating diagonal labels across the viewport (default true). */
  tiled?: boolean;
}

/**
 * Forensic overlay: account code (U…) + viewer first name + local time.
 * Use on pages that show other members' sensitive listing or profile data.
 */
export function ViewerForensicWatermark({ active = true, tiled = true }: ViewerForensicWatermarkProps) {
  const { isLoggedIn, accountMeta, user } = useAuth();
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

  const firstName = useMemo(() => {
    const a = accountMeta?.firstName?.trim();
    if (a) return a;
    const parts = user?.fullName?.trim().split(/\s+/).filter(Boolean);
    return parts?.[0] ?? "";
  }, [accountMeta?.firstName, user?.fullName]);

  const timeStr = useMemo(
    () =>
      new Date().toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    []
  );

  if (!active || !isLoggedIn || !accountCode) return null;

  const parts = [accountCode, firstName || undefined, timeStr].filter(Boolean) as string[];
  const line = parts.join(" · ");

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
              className="absolute text-[9px] sm:text-[10px] font-medium text-gray-700/[0.11] dark:text-gray-300/[0.14] select-none whitespace-nowrap -rotate-[17deg] tracking-tight"
              style={{ top: pos.top, left: pos.left }}
            >
              {line}
            </span>
          ))}
        </div>
      )}
      <div
        className="pointer-events-none fixed bottom-0 left-0 right-0 z-[23] px-2 py-1.5 sm:py-2 bg-black/50 text-white/92 text-[10px] sm:text-[11px] text-center font-medium leading-snug max-w-[100vw] backdrop-blur-[3px]"
        role="status"
        aria-live="polite"
      >
        {line}
      </div>
    </>
  );
}
