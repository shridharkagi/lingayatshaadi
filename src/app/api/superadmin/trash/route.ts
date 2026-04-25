import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";
const isMissingRelation = (msg?: string) =>
  !!msg && (msg.includes("does not exist") || msg.includes("schema cache"));

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("profile_trash")
    .select("id, profile_id, public_id, full_name, deleted_reason, deleted_note, deleted_at, is_purged")
    .order("deleted_at", { ascending: false })
    .limit(200);
  if (error && !isMissingRelation(error.message)) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    items: data || [],
    setupWarning: error ? "profile_trash table is not created yet." : null,
  });
}
