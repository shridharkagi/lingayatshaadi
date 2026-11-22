import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";

/** Lightweight check used by the admin layout to gate the console. */
export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  return NextResponse.json({ ok: true, userId: auth.userId });
}
