"use client";

import { useEffect } from "react";

/**
 * Removes the inert attribute from body after React has hydrated.
 * With Turbopack/Next 16, the hydration chunk can load late; setting body inert
 * initially prevents clicks from firing before React attaches event handlers.
 */
export function HydrationGate() {
  useEffect(() => {
    document.body.removeAttribute("inert");
  }, []);
  return null;
}
