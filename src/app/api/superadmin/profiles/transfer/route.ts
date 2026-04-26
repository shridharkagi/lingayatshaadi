import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";
import { logAdminAudit } from "@/lib/server/adminAudit";
import { resolveAccountCodeMap } from "@/lib/server/accountCodes";
import { listAllAuthUsers } from "@/lib/server/authUsers";

type Body = {
  profileId?: string;
  target?: string; // account code / auth user id / email / phone
  note?: string;
};

function normalizePhoneDigits(v: string): string {
  return (v || "").replace(/\D/g, "");
}

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await req.json()) as Body;
  const profileId = (body.profileId || "").trim();
  const targetRaw = (body.target || "").trim();
  if (!profileId) return NextResponse.json({ error: "profileId is required" }, { status: 400 });
  if (!targetRaw) return NextResponse.json({ error: "target is required" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .maybeSingle();
  if (profileErr || !profile) {
    return NextResponse.json({ error: profileErr?.message || "Profile not found" }, { status: 404 });
  }

  let users;
  try {
    users = await listAllAuthUsers(admin);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not load users" },
      { status: 500 }
    );
  }
  const codeByUser = await resolveAccountCodeMap(
    admin,
    users.map((u) => ({ id: u.id, created_at: u.created_at }))
  );
  const userByCode = new Map<string, (typeof users)[number]>();
  for (const u of users) {
    const code = codeByUser.get(u.id);
    if (code) userByCode.set(code.toUpperCase(), u);
  }

  const targetUpper = targetRaw.toUpperCase();
  const targetDigits = normalizePhoneDigits(targetRaw);
  const targetUser =
    users.find((u) => u.id === targetRaw) ||
    userByCode.get(targetUpper) ||
    users.find((u) => (u.email || "").toLowerCase() === targetRaw.toLowerCase()) ||
    users.find((u) => {
      const p = normalizePhoneDigits(u.phone || "");
      return !!targetDigits && !!p && (p === targetDigits || p.endsWith(targetDigits));
    });

  if (!targetUser) {
    return NextResponse.json(
      { error: "Target account not found. Use account code, auth user id, email, or phone." },
      { status: 404 }
    );
  }
  if (String(profile.user_id || "") === targetUser.id) {
    return NextResponse.json({ error: "Profile already belongs to this account." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const beforeOwner = String(profile.user_id || "");
  const afterOwner = targetUser.id;

  const { data: updated, error: updErr } = await admin
    .from("profiles")
    .update({
      user_id: afterOwner,
      updated_at: now,
    })
    .eq("id", profileId)
    .select("*")
    .single();
  if (updErr || !updated) {
    return NextResponse.json({ error: updErr?.message || "Transfer failed" }, { status: 500 });
  }

  // Keep deletion-request ownership aligned with the new account owner.
  await admin
    .from("profile_deletion_requests")
    .update({ user_id: afterOwner })
    .eq("profile_id", profileId);

  await logAdminAudit({
    actorUserId: auth.userId,
    action: "profile.transfer_ownership",
    entityType: "profile",
    entityId: profileId,
    beforeJson: { user_id: beforeOwner },
    afterJson: { user_id: afterOwner },
    meta: {
      note: body.note || null,
      target_account_code: codeByUser.get(afterOwner) || null,
      target_email: targetUser.email || null,
      target_phone: targetUser.phone || null,
      subscription_policy: "kept_on_old_account",
    },
  });

  return NextResponse.json({
    ok: true,
    profileId,
    oldOwnerUserId: beforeOwner,
    newOwnerUserId: afterOwner,
    targetAccountCode: codeByUser.get(afterOwner) || null,
  });
}

