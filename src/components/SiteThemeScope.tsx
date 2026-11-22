"use client";

import { usePathname } from "next/navigation";

/**
 * Applies the "Midnight" dark theme to every user-facing route.
 * The superadmin console keeps its own `.ad-root` theme, so it is excluded here —
 * theme variables are scoped to `.lb-midnight` and never reach admin pages.
 */
export function SiteThemeScope({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const isAdmin = pathname === "/superadmin" || pathname.startsWith("/superadmin/");
  return <div className={isAdmin ? "lb-classic" : "lb-midnight"}>{children}</div>;
}
