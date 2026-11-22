import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { isSuperAdminPhone, requireSuperAdmin } from "@/lib/server/requireSuperAdmin";
import { listAllAuthUsers } from "@/lib/server/authUsers";
import { getPersistedAccountCodeMap } from "@/lib/server/accountCodes";

type Row = Record<string, unknown>;

/**
 * Profiles created by the admin team:
 *   - every profile owned by an admin login (created on the admin account), and
 *   - profiles the admin created for a member, or moved from the admin
 *     account to a member (from the audit log).
 * GET ?q=&status=all|live|pending|draft|rejected|deleted&held=all|admin|member&limit=&offset=
 */
export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const sp = req.nextUrl.searchParams;
  const admin = createSupabaseAdmin();

  const [users, roleRes, auditRes] = await Promise.all([
    listAllAuthUsers(admin),
    admin.from("profiles").select("user_id").eq("role", "superadmin").limit(100),
    admin
      .from("admin_audit_logs")
      .select("action_type, entity_id, before_json, actor_user_id, created_at")
      .in("action_type", ["profile.create", "profile.transfer_ownership"])
      .order("created_at", { ascending: true })
      .limit(5000),
  ]);
  const adminIds = new Set<string>([
    auth.userId,
    ...users.filter((u) => isSuperAdminPhone(u.phone)).map((u) => u.id),
    ...((roleRes.data || []) as Row[]).map((r) => String(r.user_id || "")).filter(Boolean),
  ]);

  // Profiles created by an admin (any owner) or moved out of an admin account.
  const createdAt = new Map<string, string>();
  const viaAudit = new Set<string>();
  for (const a of (auditRes.data || []) as Row[]) {
    const pid = String(a.entity_id || "");
    if (!pid) continue;
    if (a.action_type === "profile.create") {
      viaAudit.add(pid);
      createdAt.set(pid, String(a.created_at));
    } else {
      const fromOwner = String(((a.before_json || {}) as Row).user_id || "");
      if (adminIds.has(fromOwner)) viaAudit.add(pid);
    }
  }

  const cols =
    "id, user_id, public_id, full_name, gender, date_of_birth, city, district, profession, relationship, moderation_status, approved_snapshot, deleted_at, profile_photo, created_at, approved_at, updated_at";
  const [ownedRes, auditProfilesRes] = await Promise.all([
    admin.from("profiles").select(cols).in("user_id", [...adminIds]).limit(5000),
    viaAudit.size ? admin.from("profiles").select(cols).in("id", [...viaAudit]).limit(5000) : Promise.resolve({ data: [] as Row[] }),
  ]);
  const byId = new Map<string, Row>();
  for (const p of [...((ownedRes.data || []) as Row[]), ...((auditProfilesRes.data || []) as Row[])]) byId.set(String(p.id), p);

  const ownerIds = [...new Set([...byId.values()].map((p) => String(p.user_id || "")).filter((id) => id && !adminIds.has(id)))];
  const codes = await getPersistedAccountCodeMap(admin, ownerIds);
  const userById = new Map(users.map((u) => [u.id, u]));

  const statusOf = (p: Row) =>
    p.deleted_at ? "deleted"
      : p.moderation_status === "approved" || (p.approved_snapshot && p.moderation_status !== "draft") ? "live"
      : p.moderation_status === "pending_review" ? "pending"
      : p.moderation_status === "rejected" ? "rejected"
      : "draft";
  const age = (dob: unknown) => {
    const d = new Date(String(dob || ""));
    return Number.isNaN(d.getTime()) ? null : Math.floor((Date.now() - d.getTime()) / (365.25 * 86_400_000));
  };

  let rows = [...byId.values()].map((p) => {
    const owner = String(p.user_id || "");
    const heldByAdmin = adminIds.has(owner);
    const ou = userById.get(owner);
    return {
      id: p.id,
      publicId: p.public_id,
      name: p.full_name,
      gender: p.gender,
      age: age(p.date_of_birth),
      city: p.city || p.district,
      profession: p.profession,
      relationship: p.relationship,
      photo: p.profile_photo,
      status: statusOf(p),
      createdAt: createdAt.get(String(p.id)) || p.created_at,
      approvedAt: p.approved_at,
      heldByAdmin,
      owner: heldByAdmin
        ? null
        : { id: owner, code: codes.get(owner) || null, name: String((ou?.user_metadata as Row | undefined)?.full_name || ""), phone: ou?.phone || null },
    };
  });

  const counts: Record<string, number> = { all: 0, live: 0, pending: 0, draft: 0, rejected: 0, deleted: 0, admin: 0, member: 0 };
  for (const r of rows) {
    if (r.status !== "deleted") counts.all += 1;
    counts[r.status] = (counts[r.status] || 0) + 1;
    if (r.status !== "deleted") counts[r.heldByAdmin ? "admin" : "member"] += 1;
  }

  const status = sp.get("status") || "all";
  rows = status === "all" ? rows.filter((r) => r.status !== "deleted") : rows.filter((r) => r.status === status);
  const held = sp.get("held") || "all";
  if (held === "admin") rows = rows.filter((r) => r.heldByAdmin);
  if (held === "member") rows = rows.filter((r) => !r.heldByAdmin);
  const q = (sp.get("q") || "").trim().toLowerCase();
  if (q) {
    rows = rows.filter((r) =>
      [r.name, r.publicId, r.city, r.profession, r.owner?.code, r.owner?.name].some((v) => String(v || "").toLowerCase().includes(q))
    );
  }
  rows.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

  const total = rows.length;
  const limit = Math.min(Math.max(Number(sp.get("limit") || 50), 1), 200);
  const offset = Math.max(Number(sp.get("offset") || 0), 0);
  return NextResponse.json({ total, counts, rows: rows.slice(offset, offset + limit) });
}
