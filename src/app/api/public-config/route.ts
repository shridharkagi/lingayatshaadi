import { NextResponse } from "next/server";
import { readSiteConfig } from "@/lib/server/siteConfig";
import { DEFAULT_DATA_VISIBILITY_CONFIG } from "@/lib/dataVisibility";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_PUBLIC_CONFIG = {
  whatsappGroupUrl: "",
  whatsappContactNumber: "6360130905",
  callContactNumber: "6360130905",
  whatsappDefaultMessage: "I need assistance, my name: ",
  faviconUrl: "",
  externalScripts: "",
  externalScriptsHead: "",
  externalScriptsBody: "",
  externalScriptsBodyEnd: "",
  bridesHeroImageUrl:
    "https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&q=75&fit=crop",
  groomsHeroImageUrl:
    "https://images.unsplash.com/photo-1606800052052-a08af7148866?w=1600&q=70&fit=crop",
  profileFieldVisibility: DEFAULT_DATA_VISIBILITY_CONFIG,
};

export async function GET() {
  try {
    const c = await readSiteConfig();
    const bodyScripts = c.externalScriptsBody || c.externalScripts;
    return NextResponse.json({
      ...DEFAULT_PUBLIC_CONFIG,
      whatsappGroupUrl: c.whatsappGroupUrl,
      whatsappContactNumber: c.whatsappContactNumber,
      callContactNumber: c.callContactNumber,
      whatsappDefaultMessage: c.whatsappDefaultMessage,
      faviconUrl: c.faviconUrl,
      externalScripts: bodyScripts,
      externalScriptsHead: c.externalScriptsHead,
      externalScriptsBody: bodyScripts,
      externalScriptsBodyEnd: c.externalScriptsBodyEnd ?? "",
      bridesHeroImageUrl: c.bridesHeroImageUrl,
      groomsHeroImageUrl: c.groomsHeroImageUrl,
      profileFieldVisibility: c.profileFieldVisibility,
    }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } });
  } catch {
    return NextResponse.json(DEFAULT_PUBLIC_CONFIG, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  }
}
