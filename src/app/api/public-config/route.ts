import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const CONFIG_PATH = join(process.cwd(), "data", "site-config.json");

const DEFAULT_PUBLIC_CONFIG = {
  whatsappGroupUrl: "",
  whatsappContactNumber: "6360130905",
  callContactNumber: "6360130905",
  whatsappDefaultMessage: "I need assistance, my name: ",
  faviconUrl: "",
  externalScripts: "",
  bridesHeroImageUrl:
    "https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&q=75&fit=crop",
  groomsHeroImageUrl:
    "https://images.unsplash.com/photo-1606800052052-a08af7148866?w=1600&q=70&fit=crop",
};

export async function GET() {
  try {
    if (!existsSync(CONFIG_PATH)) {
      return NextResponse.json(DEFAULT_PUBLIC_CONFIG);
    }
    const parsed = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
    return NextResponse.json({
      ...DEFAULT_PUBLIC_CONFIG,
      ...(parsed || {}),
    });
  } catch {
    return NextResponse.json(DEFAULT_PUBLIC_CONFIG);
  }
}
