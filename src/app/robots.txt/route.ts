import { NextResponse } from "next/server";
import { DEFAULT_SITE_CONFIG, readSiteConfig } from "@/lib/server/siteConfig";

/**
 * Serves the exact robots.txt from site settings (Supabase / data file).
 * A dedicated route (not app/robots.ts) so we avoid build-time / CDN caching
 * of metadata and return the bytes the superadmin saved.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  let text = DEFAULT_SITE_CONFIG.robotsTxt;
  try {
    const data = await readSiteConfig();
    if (typeof data.robotsTxt === "string" && data.robotsTxt.trim()) {
      text = data.robotsTxt.trim();
    }
  } catch {
    // keep default
  }
  if (!text.endsWith("\n")) text += "\n";

  return new NextResponse(text, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, must-revalidate",
    },
  });
}
