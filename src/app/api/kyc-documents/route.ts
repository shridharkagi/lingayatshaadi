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

export async function GET(req: NextRequest) {
  const profileId = new URL(req.url).searchParams.get("profileId");
  if (!profileId) return NextResponse.json({ error: "profileId is required" }, { status: 400 });

  const auth = await requireAuthUser(req);
  const adminAuth = await requireSuperAdmin(req);
  const actorId = auth.ok ? auth.userId : adminAuth.ok ? adminAuth.userId : null;
  if (!actorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = adminAuth.ok;
  if (!isAdmin) {
    const allowed = await canAccessProfile(profileId, actorId);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("profile_kyc_documents")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const docs = [];
  for (const row of data || []) {
    const storagePath = (row as { storage_path?: string }).storage_path;
    let signedUrl: string | null = null;
    if (storagePath) {
      const { data: signed } = await admin.storage
        .from("profile-kyc-documents")
        .createSignedUrl(storagePath, 60 * 10);
      signedUrl = signed?.signedUrl || null;
    }
    docs.push({ ...(row as Record<string, unknown>), signed_url: signedUrl });
  }
  const canUserEdit = isAdmin || docs.length === 0;
  return NextResponse.json({ documents: docs, can_user_edit: canUserEdit });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthUser(req);
  const adminAuth = await requireSuperAdmin(req);
  const actorId = auth.ok ? auth.userId : adminAuth.ok ? adminAuth.userId : null;
  if (!actorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    profileId?: string;
    idType?: string;
    fileType?: string;
    fileName?: string;
    url?: string;
    storagePath?: string;
    status?: "pending" | "approved" | "rejected";
    rejectionReason?: string;
  };
  if (!body.profileId || !body.idType || !body.fileType || !body.fileName || !body.storagePath) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const isAdmin = adminAuth.ok;
  if (!isAdmin) {
    const allowed = await canAccessProfile(body.profileId, actorId);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createSupabaseAdmin();
  if (!isAdmin) {
    const { count } = await admin
      .from("profile_kyc_documents")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", body.profileId);
    if ((count || 0) > 0) {
      return NextResponse.json(
        {
          error:
            "KYC already submitted. You cannot modify documents after submission. Contact admin for changes.",
        },
        { status: 403 }
      );
    }
  }
  const insertPayload: Record<string, unknown> = {
    profile_id: body.profileId,
    id_type: body.idType,
    file_type: body.fileType,
    file_name: body.fileName,
    url: body.url || "",
    storage_path: body.storagePath,
    created_by: actorId,
  };
  if (isAdmin && body.status) {
    insertPayload.status = body.status;
    insertPayload.rejection_reason = body.rejectionReason || null;
    insertPayload.reviewed_by = actorId;
    insertPayload.reviewed_at = new Date().toISOString();
  }
  const { data, error } = await admin.from("profile_kyc_documents").insert(insertPayload).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ document: data });
}
