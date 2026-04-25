import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const adminAuth = await requireSuperAdmin(req);
  if (!adminAuth.ok) {
    return NextResponse.json(
      { error: "KYC documents are locked after submission. Only admin can delete." },
      { status: 403 }
    );
  }

  const admin = createSupabaseAdmin();
  const { data: row } = await admin
    .from("profile_kyc_documents")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();

  const { error } = await admin.from("profile_kyc_documents").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const storagePath = (row as { storage_path?: string } | null)?.storage_path;
  if (storagePath) {
    await admin.storage.from("profile-kyc-documents").remove([storagePath]);
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const adminAuth = await requireSuperAdmin(req);
  if (!adminAuth.ok) return NextResponse.json({ error: "Super admin only" }, { status: 403 });
  const body = (await req.json()) as { status?: "pending" | "approved" | "rejected"; rejectionReason?: string };
  if (!body.status) return NextResponse.json({ error: "status is required" }, { status: 400 });
  const admin = createSupabaseAdmin();
  const { error } = await admin
    .from("profile_kyc_documents")
    .update({
      status: body.status,
      rejection_reason: body.status === "rejected" ? body.rejectionReason || null : null,
      reviewed_by: adminAuth.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
