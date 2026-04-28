import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";

const CONFIG_PATH = join(process.cwd(), "data", "site-config.json");
const DEFAULT_CONFIG = {
  robotsTxt: "User-agent: *\nAllow: /",
  seoDescription: "",
  seoKeywords: "",
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

function readConfig() {
  try {
    if (existsSync(CONFIG_PATH)) {
      const parsed = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
      return { ...DEFAULT_CONFIG, ...(parsed || {}) };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_CONFIG };
}

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const config = readConfig();
  return NextResponse.json(config);
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const body = await request.json();
    const dir = join(process.cwd(), "data");
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const current = readConfig();
    const updated = {
      ...current,
      ...(typeof body.robotsTxt === "string" && { robotsTxt: body.robotsTxt }),
      ...(typeof body.seoDescription === "string" && { seoDescription: body.seoDescription }),
      ...(typeof body.seoKeywords === "string" && { seoKeywords: body.seoKeywords }),
      ...(typeof body.whatsappGroupUrl === "string" && { whatsappGroupUrl: body.whatsappGroupUrl }),
      ...(typeof body.whatsappContactNumber === "string" && { whatsappContactNumber: body.whatsappContactNumber }),
      ...(typeof body.callContactNumber === "string" && { callContactNumber: body.callContactNumber }),
      ...(typeof body.whatsappDefaultMessage === "string" && { whatsappDefaultMessage: body.whatsappDefaultMessage }),
      ...(typeof body.faviconUrl === "string" && { faviconUrl: body.faviconUrl }),
      ...(typeof body.externalScripts === "string" && { externalScripts: body.externalScripts }),
      ...(typeof body.bridesHeroImageUrl === "string" && { bridesHeroImageUrl: body.bridesHeroImageUrl }),
      ...(typeof body.groomsHeroImageUrl === "string" && { groomsHeroImageUrl: body.groomsHeroImageUrl }),
    };
    writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2), "utf-8");
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Site config save error:", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
