import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { getOptionalAuthUser } from "@/lib/server/getOptionalAuthUser";

export async function GET(req: NextRequest) {
  const auth = await getOptionalAuthUser(req);
  if (!auth.userId) {
    return NextResponse.json({ shouldShowCta: true, joinedAt: null });
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("whatsapp_leads")
    .select("created_at")
    .eq("account_id", auth.userId)
    .eq("status", "submitted")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ shouldShowCta: true, joinedAt: null });
  }

  return NextResponse.json({
    shouldShowCta: !data?.created_at,
    joinedAt: data?.created_at || null,
  });
}
