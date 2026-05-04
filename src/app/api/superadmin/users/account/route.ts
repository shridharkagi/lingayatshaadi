import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";
import { logAdminAudit } from "@/lib/server/adminAudit";

type AccountAction = "suspend" | "unsuspend" | "delete";

type RpcAuthRow = {
  id?: string;
  email?: string | null;
  phone?: string | null;
  raw_app_meta_data?: Record<string, unknown> | null;
};

function syntheticUserFromRpcRow(row: RpcAuthRow, userId: string): User {
  return {
    id: String(row.id || userId),
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    app_metadata: row.raw_app_meta_data ?? {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "",
    role: "authenticated",
    updated_at: "",
  } as User;
}

/**
 * Prefer Postgres RPC read (reliable). GoTrue getUserById often returns
 * "Database error loading user" on affected projects.
 */
async function getAuthUserForAdmin(admin: ReturnType<typeof createSupabaseAdmin>, userId: string) {
  const { data: rpcRows, error: rpcErr } = await admin.rpc("get_auth_user_admin", {
    p_user_id: userId,
  });
  if (!rpcErr && Array.isArray(rpcRows) && rpcRows.length > 0) {
    return { user: syntheticUserFromRpcRow(rpcRows[0] as RpcAuthRow, userId), error: null as string | null };
  }

  const { data: apiData, error: apiErr } = await admin.auth.admin.getUserById(userId);
  if (!apiErr && apiData?.user) {
    return { user: apiData.user as User, error: null as string | null };
  }

  if (rpcErr) {
    return {
      user: null as User | null,
      error: rpcErr.message || apiErr?.message || "Could not load auth user (apply supabase-get-auth-user-admin.sql)",
    };
  }
  return { user: null as User | null, error: apiErr?.message || "User not found" };
}

/** Suspend/unsuspend: try GoTrue, then direct auth.users update (supabase-auth-admin-mutations.sql). */
async function writeAppMetadata(
  admin: ReturnType<typeof createSupabaseAdmin>,
  userId: string,
  appMeta: Record<string, unknown>
): Promise<{ error: string | null }> {
  const { error: apiErr } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: appMeta,
  });
  if (!apiErr) return { error: null };

  const { error: rpcErr } = await admin.rpc("admin_set_auth_app_metadata", {
    p_user_id: userId,
    p_raw_app_meta: appMeta,
  });
  if (!rpcErr) return { error: null };

  return {
    error:
      rpcErr.message ||
      apiErr.message ||
      "Could not update user (apply supabase-auth-admin-mutations.sql if GoTrue admin API fails)",
  };
}

/** Delete auth user: try GoTrue, then DELETE FROM auth.users (same SQL migration). */
async function deleteAuthUserRow(
  admin: ReturnType<typeof createSupabaseAdmin>,
  userId: string
): Promise<{ error: string | null }> {
  const { error: apiErr } = await admin.auth.admin.deleteUser(userId);
  if (!apiErr) return { error: null };

  const { error: rpcErr } = await admin.rpc("admin_delete_auth_user", {
    p_user_id: userId,
  });
  if (!rpcErr) return { error: null };

  return {
    error:
      rpcErr.message ||
      apiErr.message ||
      "Could not delete user (apply supabase-auth-admin-mutations.sql if GoTrue admin API fails)",
  };
}

/**
 * Account suspend uses app_metadata only (no GoTrue ban_duration) so we avoid
 * version-specific validation errors. Password login is blocked via AuthContext
 * after sign-in by checking app_metadata + banned_until; OTP is blocked in
 * /api/auth/phone/verify.
 */
export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: { userId?: string; action?: AccountAction; reason?: string };
  try {
    body = (await req.json()) as { userId?: string; action?: AccountAction; reason?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const targetUserId = String(body.userId || "").trim();
  const action = body.action;
  const reason = String(body.reason || "").trim() || null;

  if (!targetUserId || !action) {
    return NextResponse.json({ error: "userId and action are required" }, { status: 400 });
  }
  if (!["suspend", "unsuspend", "delete"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  if (targetUserId === auth.userId && (action === "suspend" || action === "delete")) {
    return NextResponse.json(
      { error: "You cannot suspend or delete your own account from this session." },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdmin();

  if (action === "delete") {
    const { user: delUser, error: loadDelErr } = await getAuthUserForAdmin(admin, targetUserId);
    if (loadDelErr || !delUser) {
      return NextResponse.json({ error: loadDelErr || "User not found" }, { status: 404 });
    }
    const u = delUser;
    await logAdminAudit({
      actorUserId: auth.userId,
      action: "account.delete",
      entityType: "auth_user",
      entityId: targetUserId,
      meta: {
        delete_reason: reason,
        email_snapshot: u.email ?? null,
        phone_snapshot: u.phone ?? null,
      },
    });
    const { error: delErr } = await deleteAuthUserRow(admin, targetUserId);
    if (delErr) {
      return NextResponse.json({ error: delErr }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const { user: beforeUser, error: loadErr } = await getAuthUserForAdmin(admin, targetUserId);
  if (loadErr || !beforeUser) {
    return NextResponse.json({ error: loadErr || "User not found" }, { status: 404 });
  }

  const prevMeta = { ...((beforeUser.app_metadata || {}) as Record<string, unknown>) };

  if (action === "suspend") {
    const nextMeta = {
      ...prevMeta,
      account_suspended: true,
      suspended_at: new Date().toISOString(),
      ...(reason ? { suspend_reason: reason } : {}),
    };
    const { error: writeErr } = await writeAppMetadata(admin, targetUserId, nextMeta);
    if (writeErr) return NextResponse.json({ error: writeErr }, { status: 500 });
    await logAdminAudit({
      actorUserId: auth.userId,
      action: "account.suspend",
      entityType: "auth_user",
      entityId: targetUserId,
      beforeJson: prevMeta,
      afterJson: nextMeta,
      meta: reason ? { reason } : null,
    });
    return NextResponse.json({ ok: true });
  }

  const nextMeta = { ...prevMeta };
  nextMeta.account_suspended = false;
  delete nextMeta.suspended_at;
  delete nextMeta.suspend_reason;

  const { error: writeErrUn } = await writeAppMetadata(admin, targetUserId, nextMeta);
  if (writeErrUn) return NextResponse.json({ error: writeErrUn }, { status: 500 });

  await logAdminAudit({
    actorUserId: auth.userId,
    action: "account.unsuspend",
    entityType: "auth_user",
    entityId: targetUserId,
    beforeJson: prevMeta,
    afterJson: nextMeta,
  });
  return NextResponse.json({ ok: true });
}
