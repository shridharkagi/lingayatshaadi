"use client";

import { useEffect, useRef } from "react";

/**
 * When a dropdown opens, gently scroll just enough to show all of it
 * (instead of an abrupt jump or a list hidden under a sticky bar).
 * Pair with the `.ui-pop` class, which sets scroll margins.
 */
export function useRevealOnOpen<T extends HTMLElement>(open: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      ref.current?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
    });
    return () => cancelAnimationFrame(id);
  }, [open]);
  return ref;
}
