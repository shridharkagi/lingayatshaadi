import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";
import { generatePublicIdFromExistingIds } from "@/lib/memberId";
import { listAllAuthUsers } from "@/lib/server/authUsers";
import { resolveAccountCodeMap } from "@/lib/server/accountCodes";

type ReviewTab =
  | "published"
  | "pending"
  | "draft"
  | "rejected"
  | "suspended"
  | "trash"
  | "plan_over";
const isMissingRelation = (msg?: string) =>
  !!msg && (msg.includes("does not exist") || msg.includes("schema cache"));

type DateFilter = "all" | "today" | "last7" | "last30" | "this_month";

function getDateFloor(filter: DateFilter): string | null {
  const now = new Date();
  if (filter === "today") {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return d.toISOString();
  }
  if (filter === "last7") {
    const d = new Date(now);
    d.setDate(now.getDate() - 7);
    return d.toISOString();
  }
  if (filter === "last30") {
    const d = new Date(now);
    d.setDate(now.getDate() - 30);
    return d.toISOString();
  }
  if (filter === "this_month") {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    return d.toISOString();
  }
  return null;
}

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(req.url);
  const tab = (url.searchParams.get("tab") || "pending") as ReviewTab;
  const dateFilter = (url.searchParams.get("dateFilter") || "all") as DateFilter;
  const genderFilter = (url.searchParams.get("gender") || "all") as "all" | "male" | "female";
  const admin = createSupabaseAdmin();

  if (tab === "trash") {
    const { data, error } = await admin
      .from("profile_trash")
      .select("id, profile_id, public_id, full_name, deleted_reason, deleted_note, deleted_at, is_purged")
      .is("restored_at", null)
      .eq("is_purged", false)
      .order("deleted_at", { ascending: false })
      .limit(200);
    if (error && !isMissingRelation(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const trashRows = (data || []) as Array<Record<string, unknown>>;

    // Fallback: include soft-deleted profiles even if profile_trash row is missing.
    const { data: fallbackDeleted, error: fallbackErr } = await admin
      .from("profiles")
      .select("id, public_id, full_name, city, deleted_reason, deleted_note, deleted_at")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false })
      .limit(200);
    if (fallbackErr && !isMissingRelation(fallbackErr.message)) {
      return NextResponse.json({ error: fallbackErr.message }, { status: 500 });
    }
    const existingIds = new Set(trashRows.map((r) => String(r.profile_id || "")));
    const merged = [
      ...trashRows,
      ...((fallbackDeleted || [])
        .filter((r) => !existingIds.has(String((r as { id?: string }).id || "")))
        .map((r) => {
          const row = r as Record<string, unknown>;
          return {
            id: row.id,
            profile_id: row.id,
            public_id: row.public_id,
            full_name: row.full_name,
            city: row.city,
            deleted_reason: row.deleted_reason,
            deleted_note: row.deleted_note,
            deleted_at: row.deleted_at,
            is_purged: false,
          };
        }) as Array<Record<string, unknown>>),
    ];
    return NextResponse.json({ items: merged });
  }

  let q = admin
    .from("profiles")
    .select(
      "id, user_id, full_name, public_id, verified, profile_status, moderation_status, city, state, gender, contact, account_holder_name, created_at, updated_at, approved_at, deleted_at"
    )
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (tab === "published") {
    q = q.or("moderation_status.eq.approved,profile_status.eq.verified");
  } else if (tab === "pending") {
    q = q.or("verified.eq.false,moderation_status.eq.pending_review");
  } else if (tab === "draft") {
    q = q.eq("moderation_status", "draft");
  } else if (tab === "rejected") {
    q = q.or("moderation_status.eq.rejected,profile_status.eq.rejected");
  } else if (tab === "suspended") {
    q = q.eq("profile_status", "suspended");
  } else if (tab === "plan_over") {
    const nowIso = new Date().toISOString();
    const { data: expiredSubs, error: subsErr } = await admin
      .from("user_subscriptions")
      .select("profile_id")
      .or(`status.eq.expired,expires_at.lt.${nowIso}`)
      .not("profile_id", "is", null)
      .order("expires_at", { ascending: false })
      .limit(500);
    if (subsErr && !isMissingRelation(subsErr.message)) {
      return NextResponse.json({ error: subsErr.message }, { status: 500 });
    }
    const expiredIds = (expiredSubs || [])
      .map((s) => (s as { profile_id?: string | null }).profile_id || "")
      .filter(Boolean);
    if (expiredIds.length === 0) {
      return NextResponse.json({ items: [] });
    }
    q = q.in("id", expiredIds);
  }

  if (genderFilter !== "all") {
    q = q.eq("gender", genderFilter);
  }
  const floor = getDateFloor(dateFilter);
  if (floor) {
    if (tab === "published") q = q.gte("approved_at", floor);
    else q = q.gte("updated_at", floor);
  }

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = (data || []) as Array<Record<string, unknown>>;
  const missingPublicIdRows = items.filter((r) => !String(r.public_id || "").trim());
  if (missingPublicIdRows.length > 0) {
    const { data: existingIds } = await admin.from("profiles").select("public_id").like("public_id", "L%");
    const seed = (existingIds || [])
      .map((r) => (r as { public_id?: string | null }).public_id || "")
      .filter(Boolean);
    for (const row of missingPublicIdRows) {
      const id = String(row.id || "");
      if (!id) continue;
      const gender = (String(row.gender || "male") === "female" ? "female" : "male") as "male" | "female";
      const next = generatePublicIdFromExistingIds(seed, gender);
      seed.push(next);
      await admin.from("profiles").update({ public_id: next }).eq("id", id);
      row.public_id = next;
    }
  }
  const profileIds = items.map((r) => (r as { id?: string }).id).filter(Boolean) as string[];
  const ownerUserIds = [
    ...new Set(
      items
        .map((r) => String((r as { user_id?: string }).user_id || ""))
        .filter(Boolean)
    ),
  ];

  const ownerNameByUserId = new Map<string, string>();
  const ownerPhoneByUserId = new Map<string, string>();
  const ownerCodeByUserId = new Map<string, string>();
  if (ownerUserIds.length > 0) {
    try {
      const authUsers = await listAllAuthUsers(admin);
      const codeMap = await resolveAccountCodeMap(
        admin,
        authUsers.map((u) => ({ id: u.id, created_at: u.created_at }))
      );
      for (const u of authUsers) {
        if (!ownerUserIds.includes(u.id)) continue;
        const code = String(codeMap.get(u.id) || "").trim();
        if (code) ownerCodeByUserId.set(u.id, code);
        const fullName = String((u.user_metadata?.full_name as string) || "").trim();
        if (fullName) ownerNameByUserId.set(u.id, fullName);
        const phone = String(u.phone || "").trim();
        if (phone) ownerPhoneByUserId.set(u.id, phone);
      }
    } catch {
      // Fallback to profile-derived owner info below.
    }
    const { data: ownerProfiles } = await admin
      .from("profiles")
      .select("user_id, account_holder_name, contact, updated_at")
      .in("user_id", ownerUserIds)
      .order("updated_at", { ascending: false })
      .limit(1000);
    for (const row of (ownerProfiles || []) as Array<{
      user_id?: string;
      account_holder_name?: string | null;
      contact?: string | null;
    }>) {
      const uid = String(row.user_id || "").trim();
      if (!uid) continue;
      if (!ownerNameByUserId.has(uid)) {
        const n = String(row.account_holder_name || "").trim();
        if (n) ownerNameByUserId.set(uid, n);
      }
      if (!ownerPhoneByUserId.has(uid)) {
        const p = String(row.contact || "").trim();
        if (p) ownerPhoneByUserId.set(uid, p);
      }
    }
  }

  const planByProfileId: Record<
    string,
    { name: string; code: string; starts_at: string | null; expires_at: string | null; status: string }
  > = {};
  if (profileIds.length > 0) {
    const { data: subs, error: subsErr } = await admin
      .from("user_subscriptions")
      .select("profile_id, status, starts_at, expires_at, created_at, subscription_plans(name, code)")
      .in("profile_id", profileIds)
      .order("created_at", { ascending: false });
    if (!subsErr || isMissingRelation(subsErr?.message)) {
      for (const row of subs || []) {
        const r = row as {
          profile_id?: string | null;
          status?: string;
          starts_at?: string | null;
          expires_at?: string | null;
          subscription_plans?: { name?: string; code?: string } | null;
        };
        const pid = r.profile_id || "";
        if (!pid || planByProfileId[pid]) continue;
        planByProfileId[pid] = {
          name: r.subscription_plans?.name || "Free",
          code: r.subscription_plans?.code || "free",
          starts_at: r.starts_at || null,
          expires_at: r.expires_at || null,
          status: r.status || "active",
        };
      }
    }
  }

  const enriched = items.map((row) => {
    const r = row as Record<string, unknown>;
    const pid = String(r.id || "");
    const ownerUserId = String(r.user_id || "");
    const plan = planByProfileId[pid] || {
      name: "Free",
      code: "free",
      starts_at: null,
      expires_at: null,
      status: "active",
    };
    return {
      ...r,
      account_owner_code: ownerCodeByUserId.get(ownerUserId) || "",
      account_owner_name:
        ownerNameByUserId.get(ownerUserId) ||
        String(r.account_holder_name || r.full_name || "-"),
      account_owner_number:
        ownerPhoneByUserId.get(ownerUserId) ||
        String(r.contact || "-"),
      published_at: r.approved_at || r.updated_at || r.created_at || null,
      plan_name: plan.name,
      plan_code: plan.code,
      plan_status: plan.status,
      plan_starts_at: plan.starts_at,
      plan_expires_at: plan.expires_at,
    };
  });

  return NextResponse.json({ items: enriched });
}
