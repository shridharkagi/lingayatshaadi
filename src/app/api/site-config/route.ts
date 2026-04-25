import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";

const CONFIG_PATH = join(process.cwd(), "data", "site-config.json");

function readConfig() {
  try {
    if (existsSync(CONFIG_PATH)) {
      return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
    }
  } catch {
    // ignore
  }
  return { robotsTxt: "User-agent: *\nAllow: /", seoDescription: "", seoKeywords: "" };
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
    };
    writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2), "utf-8");
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Site config save error:", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
