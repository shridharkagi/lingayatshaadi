import { NextRequest, NextResponse } from "next/server";
import type { Profile } from "@/types";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";
import { toProfileRow, fromProfileRow, type ProfileRow } from "@/lib/profileMapper";

/**
 * Superadmin can load/update any profile row. Client-side Supabase is RLS-limited
 * to the signed-in user, so /superadmin/users/:id/edit must use this API.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing profile id" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("profiles").select("*").eq("id", id).single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Profile not found" }, { status: 404 });
  }
  return NextResponse.json({ profile: fromProfileRow(data as ProfileRow) });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing profile id" }, { status: 400 });

  let body: { profile?: Partial<Profile> } = {};
  try {
    body = (await req.json()) as { profile?: Partial<Profile> };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const row = toProfileRow(body.profile || {});
  delete row.id;
  delete (row as { user_id?: unknown }).user_id;

  const { data, error } = await admin.from("profiles").update(row).eq("id", id).select("*").single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ profile: fromProfileRow(data as ProfileRow) });
}
