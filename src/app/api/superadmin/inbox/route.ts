import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";
import { getInboxCounts } from "@/lib/server/adminInbox";

/** Sidebar badge counts (lightweight; refreshed on every admin navigation). */
export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  return NextResponse.json({ inbox: await getInboxCounts(createSupabaseAdmin()) });
}
