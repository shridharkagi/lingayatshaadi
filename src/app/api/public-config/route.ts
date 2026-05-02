import { NextResponse } from "next/server";
import { readSiteConfig } from "@/lib/server/siteConfig";

const DEFAULT_PUBLIC_CONFIG = {
  whatsappGroupUrl: "",
  whatsappContactNumber: "6360130905",
  callContactNumber: "6360130905",
  whatsappDefaultMessage: "I need assistance, my name: ",
  faviconUrl: "",
  externalScripts: "",
  externalScriptsHead: "",
  externalScriptsBody: "",
  bridesHeroImageUrl:
    "https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&q=75&fit=crop",
  groomsHeroImageUrl:
    "https://images.unsplash.com/photo-1606800052052-a08af7148866?w=1600&q=70&fit=crop",
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
      bridesHeroImageUrl: c.bridesHeroImageUrl,
      groomsHeroImageUrl: c.groomsHeroImageUrl,
    });
  } catch {
    return NextResponse.json(DEFAULT_PUBLIC_CONFIG);
  }
}
