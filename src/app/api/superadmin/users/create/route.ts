import { NextRequest, NextResponse } from "next/server";
import type { Profile } from "@/types";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";
import { generatePublicIdFromExistingIds } from "@/lib/memberId";
import { toProfileRow } from "@/lib/profileMapper";
import { logAdminAudit } from "@/lib/server/adminAudit";
import { invalidateAuthUsersCache } from "@/lib/server/authUsers";

function fallbackProfileEmail(superAdminUserId: string): string {
  const safe = String(superAdminUserId || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 20) || "admin";
  return `sa_${safe}@profile.lingayatbandhu`;
}

export async function POST(req: NextRequest) {
  invalidateAuthUsersCache();
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: { profile?: Partial<Profile>; ownerAccountId?: string } = {};
  try {
    body = (await req.json()) as { profile?: Partial<Profile>; ownerAccountId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const input = body.profile || {};
  const fullName = String(input.fullName || "").trim();
  const dateOfBirth = String(input.dateOfBirth || "").trim();
  const gender = input.gender === "female" ? "female" : input.gender === "male" ? "male" : "";
  if (!fullName) return NextResponse.json({ error: "Full name is required" }, { status: 400 });
  if (!dateOfBirth) return NextResponse.json({ error: "Date of birth is required" }, { status: 400 });
  if (!gender) return NextResponse.json({ error: "Gender is required" }, { status: 400 });

  const admin = createSupabaseAdmin();

  // Owner: the admin's own account (default) or an existing member account.
  const ownerId = String(body.ownerAccountId || "").trim() || auth.userId;
  const forMember = ownerId !== auth.userId;
  if (forMember) {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("user_id", ownerId)
      .is("deleted_at", null);
    if ((count || 0) >= 3) {
      return NextResponse.json({ error: "That account already has 3 profiles (the maximum)." }, { status: 400 });
    }
  }

  let accountEmail = "";
  let accountName = "";
  try {
    const authRes = await admin.auth.admin.getUserById(ownerId);
    if (forMember && !authRes.data.user) {
      return NextResponse.json({ error: "Owner account not found" }, { status: 404 });
    }
    accountEmail = String(authRes.data.user?.email || "").trim();
    accountName =
      String((authRes.data.user?.user_metadata?.full_name as string) || "").trim() ||
      String((authRes.data.user?.user_metadata?.first_name as string) || "").trim();
  } catch {
    accountEmail = "";
    accountName = "";
  }

  const profilePayload: Partial<Profile> = {
    ...input,
    fullName,
    dateOfBirth,
    gender: gender as "male" | "female",
    email: accountEmail || fallbackProfileEmail(auth.userId),
    // Admin-owned profiles are marked as such; member-owned ones keep the member's name.
    accountHolderName: forMember ? accountName || input.accountHolderName || "" : "Admin",
    managedBy: input.managedBy || "parent",
  };

  const row = toProfileRow(profilePayload);
  row.user_id = ownerId;
  row.email = String(row.email || accountEmail || fallbackProfileEmail(auth.userId));

  // Superadmin-created profiles should go to moderation queue by default.
  if (row.moderation_status == null) row.moderation_status = "pending_review";
  if (row.last_submitted_at == null) row.last_submitted_at = new Date().toISOString();

  if (!row.public_id) {
    const { data: existingIds } = await admin.from("profiles").select("public_id").like("public_id", "L%");
    const seed = (existingIds || [])
      .map((r) => String((r as { public_id?: string | null }).public_id || ""))
      .filter(Boolean);
    row.public_id = generatePublicIdFromExistingIds(seed, gender as "male" | "female");
  }

  const { data: inserted, error } = await admin.from("profiles").insert(row).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const newId = String((inserted as { id?: string } | null)?.id || "");

  await logAdminAudit({
    actorUserId: auth.userId,
    action: "profile.create",
    entityType: "profile",
    entityId: newId,
    afterJson: { full_name: fullName, gender, owner_account_id: ownerId },
    meta: { owner: forMember ? "member" : "admin" },
  });

  return NextResponse.json({
    profileId: newId,
  });
}

