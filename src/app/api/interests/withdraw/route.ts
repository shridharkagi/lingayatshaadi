import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireAuthUser } from "@/lib/server/requireAuthUser";

export async function POST(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await req.json()) as { interestId?: string };
  if (!body.interestId) {
    return NextResponse.json({ error: "interestId is required" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const { data: interest } = await admin
    .from("interests")
    .select("id, from_id, status")
    .eq("id", body.interestId)
    .maybeSingle();

  if (!interest) {
    return NextResponse.json({ error: "Interest not found" }, { status: 404 });
  }

  const { data: senderProfile } = await admin
    .from("profiles")
    .select("id, user_id")
    .eq("id", interest.from_id)
    .maybeSingle();

  if (!senderProfile || senderProfile.user_id !== auth.userId) {
    return NextResponse.json({ error: "Unauthorized interest action" }, { status: 403 });
  }

  if (interest.status !== "pending") {
    return NextResponse.json({ error: "Only pending interests can be withdrawn" }, { status: 400 });
  }

  const { error } = await admin.from("interests").delete().eq("id", body.interestId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
