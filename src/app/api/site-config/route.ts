import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";
import type { SiteConfig } from "@/lib/server/siteConfig";
import { mergeAndPersistSiteConfig, readSiteConfig } from "@/lib/server/siteConfig";

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const config = await readSiteConfig();
  return NextResponse.json(config);
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const body = await request.json();
    const patch: Partial<SiteConfig> = {};
    if (typeof body.robotsTxt === "string") patch.robotsTxt = body.robotsTxt;
    if (typeof body.seoDescription === "string") patch.seoDescription = body.seoDescription;
    if (typeof body.seoKeywords === "string") patch.seoKeywords = body.seoKeywords;
    if (typeof body.whatsappGroupUrl === "string") patch.whatsappGroupUrl = body.whatsappGroupUrl;
    if (typeof body.whatsappContactNumber === "string") patch.whatsappContactNumber = body.whatsappContactNumber;
    if (typeof body.callContactNumber === "string") patch.callContactNumber = body.callContactNumber;
    if (typeof body.whatsappDefaultMessage === "string") patch.whatsappDefaultMessage = body.whatsappDefaultMessage;
    if (typeof body.faviconUrl === "string") patch.faviconUrl = body.faviconUrl;
    if (typeof body.externalScriptsHead === "string") patch.externalScriptsHead = body.externalScriptsHead;
    if (typeof body.externalScriptsBody === "string") {
      patch.externalScriptsBody = body.externalScriptsBody;
      patch.externalScripts = body.externalScriptsBody;
    }
    if (typeof body.externalScripts === "string" && patch.externalScriptsBody === undefined) {
      patch.externalScripts = body.externalScripts;
      patch.externalScriptsBody = body.externalScripts;
    }
    if (typeof body.externalScriptsBodyEnd === "string") {
      patch.externalScriptsBodyEnd = body.externalScriptsBodyEnd;
    }
    if (typeof body.bridesHeroImageUrl === "string") patch.bridesHeroImageUrl = body.bridesHeroImageUrl;
    if (typeof body.groomsHeroImageUrl === "string") patch.groomsHeroImageUrl = body.groomsHeroImageUrl;

    const result = await mergeAndPersistSiteConfig(patch);
    if (!result.ok) {
      console.error("Site config save error:", result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Site config save error:", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
