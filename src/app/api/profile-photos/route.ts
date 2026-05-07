import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireAuthUser } from "@/lib/server/requireAuthUser";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";

async function canAccessProfile(profileId: string, actorUserId: string): Promise<boolean> {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("profiles").select("id,user_id").eq("id", profileId).maybeSingle();
  if (!data) return false;
  return (data as { user_id?: string }).user_id === actorUserId;
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthUser(req);
  const adminAuth = await requireSuperAdmin(req);
  const actorId = auth.ok ? auth.userId : adminAuth.ok ? adminAuth.userId : null;
  if (!actorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    profileId?: string;
    url?: string;
    storagePath?: string;
    sortOrder?: number;
    isPrimary?: boolean;
  };

  if (!body.profileId || !body.url) {
    return NextResponse.json({ error: "profileId and url are required" }, { status: 400 });
  }

  const isAdmin = adminAuth.ok;
  if (!isAdmin) {
    const allowed = await canAccessProfile(body.profileId, actorId);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("profile_photos")
    .insert({
      profile_id: body.profileId,
      url: body.url,
      storage_path: body.storagePath ?? null,
      sort_order: Number.isFinite(body.sortOrder) ? body.sortOrder : 0,
      is_primary: Boolean(body.isPrimary),
      status: "pending",
      uploaded_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ photo: data });
}
