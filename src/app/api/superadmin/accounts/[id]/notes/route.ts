import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";

/** Add an internal admin note to an account. POST { body } */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await ctx.params;
  const { body } = (await req.json().catch(() => ({}))) as { body?: string };
  const text = (body || "").trim();
  if (!text) return NextResponse.json({ error: "Note can't be empty" }, { status: 400 });
  if (text.length > 2000) return NextResponse.json({ error: "Note is too long (max 2000 characters)" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("admin_notes")
    .insert({ user_id: id, body: text, created_by: auth.userId })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ note: data });
}
