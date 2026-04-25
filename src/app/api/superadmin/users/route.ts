import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";
import { computeAccountCodes } from "@/lib/accountCode";
import { generatePublicIdFromExistingIds } from "@/lib/memberId";
import { listAllAuthUsers, type AuthUserLite } from "@/lib/server/authUsers";

type Range = "all" | "today" | "last7" | "last30" | "this_month";

function getFloor(range: Range): string | null {
  const now = new Date();
  if (range === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  if (range === "last7") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d.toISOString();
  }
  if (range === "last30") {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return d.toISOString();
  }
  if (range === "this_month") return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  return null;
}

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  const signupRange = (url.searchParams.get("signupRange") || "all") as Range;
  const activityRange = (url.searchParams.get("activityRange") || "all") as Range;
  const customFrom = url.searchParams.get("customFrom");
  const customTo = url.searchParams.get("customTo");

  const admin = createSupabaseAdmin();
  let listedUsers: AuthUserLite[] = [];
  try {
    listedUsers = await listAllAuthUsers(admin);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error finding users" },
      { status: 500 }
    );
  }

  const allUsersForCodes = listedUsers.map((u) => ({
    id: u.id,
    created_at: u.created_at,
  }));
  const codeByUser = computeAccountCodes(allUsersForCodes);

  let users = listedUsers;
  const signupFloor = getFloor(signupRange);
  if (signupFloor) {
    users = users.filter((u) => !!u.created_at && new Date(u.created_at).getTime() >= new Date(signupFloor).getTime());
  } else {
    if (customFrom) users = users.filter((u) => !!u.created_at && new Date(u.created_at).getTime() >= new Date(customFrom).getTime());
    if (customTo) {
      const toEndTs = new Date(customTo).getTime() + 24 * 60 * 60 * 1000 - 1;
      users = users.filter((u) => !!u.created_at && new Date(u.created_at).getTime() <= toEndTs);
    }
  }

  const userIds = users.map((u) => u.id);
  if (userIds.length === 0) return NextResponse.json({ users: [] });
  const { data: profiles, error: pErr } = await admin
    .from("profiles")
    .select("id, user_id, public_id, full_name, profile_status, moderation_status, updated_at, contact, deleted_at")
    .in("user_id", userIds);
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  // Backfill missing public IDs so admin/user links can stay on canonical lb/lg slugs.
  const profileRows = (profiles || []) as Array<Record<string, unknown>>;
  const missingPublicIdRows = profileRows.filter((p) => !String(p.public_id || "").trim());
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

  const map = new Map<string, Array<Record<string, unknown>>>();
  for (const p of profileRows) {
    const uid = (p as { user_id?: string }).user_id;
    if (!uid) continue;
    if (!map.has(uid)) map.set(uid, []);
    map.get(uid)?.push(p as Record<string, unknown>);
  }

  const profileIds = profileRows.map((p) => (p as { id?: string }).id).filter(Boolean) as string[];
  const profileMeta = new Map<string, { user_id: string; public_id: string; full_name: string }>();
  for (const p of profileRows) {
    const row = p as { id?: string; user_id?: string; public_id?: string; full_name?: string };
    if (!row.id || !row.user_id) continue;
    profileMeta.set(row.id, {
      user_id: row.user_id,
      public_id: row.public_id || row.id,
      full_name: row.full_name || "Unknown",
    });
  }

  let profileViews: Array<Record<string, unknown>> = [];
  let contactViews: Array<Record<string, unknown>> = [];
  let shortlistRows: Array<Record<string, unknown>> = [];
  let interestRows: Array<Record<string, unknown>> = [];
  let subscriptionRows: Array<Record<string, unknown>> = [];
  let paymentRows: Array<Record<string, unknown>> = [];

  const emptyRows = Promise.resolve({ data: [] as Record<string, unknown>[], error: null as { message: string } | null });
  const subsQ =
    userIds.length > 0
      ? admin
          .from("user_subscriptions")
          .select("user_id, plan_id, status, starts_at, expires_at")
          .in("user_id", userIds)
          .limit(5000)
      : emptyRows;
  const payQ =
    userIds.length > 0
      ? admin.from("payment_transactions").select("user_id, amount, status").in("user_id", userIds).limit(15000)
      : emptyRows;

  if (profileIds.length > 0) {
    const [pv, cv, sh, it, subsRes, payRes] = await Promise.all([
      admin.from("profile_views").select("viewer_id, viewed_id, viewed_at").in("viewer_id", profileIds).limit(10000),
      admin.from("contact_views").select("viewer_id, viewed_id, viewed_at").in("viewer_id", profileIds).limit(10000),
      admin.from("shortlisted_profiles").select("user_id, profile_id, created_at").in("user_id", profileIds).limit(10000),
      admin.from("interests").select("from_id, to_id, status, created_at").in("from_id", profileIds).limit(10000),
      subsQ,
      payQ,
    ]);
    profileViews = pv.data || [];
    contactViews = cv.data || [];
    shortlistRows = sh.data || [];
    interestRows = it.data || [];
    subscriptionRows = !subsRes.error ? subsRes.data || [] : [];
    paymentRows = !payRes.error ? payRes.data || [] : [];
  } else {
    const [subsRes, payRes] = await Promise.all([subsQ, payQ]);
    subscriptionRows = !subsRes.error ? subsRes.data || [] : [];
    paymentRows = !payRes.error ? payRes.data || [] : [];
  }

  const planIds = [
    ...new Set(
      subscriptionRows
        .map((s) => String((s as { plan_id?: string }).plan_id || ""))
        .filter((id) => id.length > 0)
    ),
  ];
  const planNameById = new Map<string, string>();
  if (planIds.length > 0) {
    const [mp, sp] = await Promise.all([
      admin.from("membership_plans").select("id, name").in("id", planIds),
      admin.from("subscription_plans").select("id, name").in("id", planIds),
    ]);
    if (!mp.error) {
      for (const r of mp.data || []) {
        const row = r as { id?: string; name?: string };
        if (row.id && row.name) planNameById.set(row.id, row.name);
      }
    }
    if (!sp.error) {
      for (const r of sp.data || []) {
        const row = r as { id?: string; name?: string };
        if (row.id && row.name) planNameById.set(row.id, row.name);
      }
    }
  }

  const nowIso = new Date().toISOString();
  type SubRow = {
    user_id: string;
    plan_id?: string;
    status?: string;
    starts_at?: string;
    expires_at?: string;
  };
  const activeSubByAuthId = new Map<string, SubRow>();
  for (const raw of subscriptionRows as SubRow[]) {
    if (String(raw.status || "") !== "active") continue;
    const starts = raw.starts_at || "";
    const ends = raw.expires_at || "";
    if (starts > nowIso || ends < nowIso) continue;
    const prev = activeSubByAuthId.get(raw.user_id);
    if (!prev || new Date(ends).getTime() > new Date(prev.expires_at || 0).getTime()) {
      activeSubByAuthId.set(raw.user_id, raw);
    }
  }

  const totalPaidByAuthId = new Map<string, number>();
  for (const raw of paymentRows) {
    const row = raw as { user_id?: string; amount?: number | string; status?: string };
    if (!row.user_id || String(row.status || "") !== "paid") continue;
    const amt = Number(row.amount || 0);
    totalPaidByAuthId.set(row.user_id, (totalPaidByAuthId.get(row.user_id) || 0) + amt);
  }

  const activityByUser = new Map<
    string,
    {
      lastActivityAt: string | null;
      contactViewsCount: number;
      savedProfilesCount: number;
      sentInterestsCount: number;
      profileViews: Array<Record<string, unknown>>;
      contactViews: Array<Record<string, unknown>>;
      savedProfiles: Array<Record<string, unknown>>;
      sentInterests: Array<Record<string, unknown>>;
    }
  >();
  for (const u of users) {
    activityByUser.set(u.id, {
      lastActivityAt: null,
      contactViewsCount: 0,
      savedProfilesCount: 0,
      sentInterestsCount: 0,
      profileViews: [],
      contactViews: [],
      savedProfiles: [],
      sentInterests: [],
    });
  }
  const bump = (uid: string, ts: string | null) => {
    const current = activityByUser.get(uid);
    if (!current || !ts) return;
    if (!current.lastActivityAt || new Date(ts).getTime() > new Date(current.lastActivityAt).getTime()) {
      current.lastActivityAt = ts;
    }
  };
  for (const p of profileRows) {
    const row = p as { user_id?: string; updated_at?: string | null };
    if (row.user_id) bump(row.user_id, row.updated_at || null);
  }
  for (const e of profileViews) {
    const ev = e as { viewer_id?: string; viewed_id?: string; viewed_at?: string | null };
    if (!ev.viewer_id) continue;
    const viewer = profileMeta.get(ev.viewer_id);
    if (!viewer) continue;
    const viewed = ev.viewed_id ? profileMeta.get(ev.viewed_id) : null;
    activityByUser.get(viewer.user_id)?.profileViews.push({
      viewed_at: ev.viewed_at || null,
      viewer_public_id: viewer.public_id,
      viewed_public_id: viewed?.public_id || ev.viewed_id || null,
      viewed_name: viewed?.full_name || "Unknown",
    });
    bump(viewer.user_id, ev.viewed_at || null);
  }
  for (const e of contactViews) {
    const ev = e as { viewer_id?: string; viewed_id?: string; viewed_at?: string | null };
    if (!ev.viewer_id) continue;
    const viewer = profileMeta.get(ev.viewer_id);
    if (!viewer) continue;
    const viewed = ev.viewed_id ? profileMeta.get(ev.viewed_id) : null;
    const bucket = activityByUser.get(viewer.user_id);
    if (!bucket) continue;
    bucket.contactViewsCount += 1;
    bucket.contactViews.push({
      viewed_at: ev.viewed_at || null,
      viewer_public_id: viewer.public_id,
      viewed_public_id: viewed?.public_id || ev.viewed_id || null,
      viewed_name: viewed?.full_name || "Unknown",
    });
    bump(viewer.user_id, ev.viewed_at || null);
  }
  for (const e of shortlistRows) {
    const ev = e as { user_id?: string; profile_id?: string; created_at?: string | null };
    if (!ev.user_id) continue;
    const viewer = profileMeta.get(ev.user_id);
    if (!viewer) continue;
    const viewed = ev.profile_id ? profileMeta.get(ev.profile_id) : null;
    const bucket = activityByUser.get(viewer.user_id);
    if (!bucket) continue;
    bucket.savedProfilesCount += 1;
    bucket.savedProfiles.push({
      created_at: ev.created_at || null,
      viewer_public_id: viewer.public_id,
      viewed_public_id: viewed?.public_id || ev.profile_id || null,
      viewed_name: viewed?.full_name || "Unknown",
    });
    bump(viewer.user_id, ev.created_at || null);
  }
  for (const e of interestRows) {
    const ev = e as { from_id?: string; to_id?: string; status?: string; created_at?: string | null };
    if (!ev.from_id) continue;
    const viewer = profileMeta.get(ev.from_id);
    if (!viewer) continue;
    const viewed = ev.to_id ? profileMeta.get(ev.to_id) : null;
    const bucket = activityByUser.get(viewer.user_id);
    if (!bucket) continue;
    bucket.sentInterestsCount += 1;
    bucket.sentInterests.push({
      created_at: ev.created_at || null,
      status: ev.status || "pending",
      sender_public_id: viewer.public_id,
      to_public_id: viewed?.public_id || ev.to_id || null,
      to_name: viewed?.full_name || "Unknown",
    });
    bump(viewer.user_id, ev.created_at || null);
  }

  const rows = users.map((u) => {
    const owned = (map.get(u.id) || []).filter((p) => !(p as { deleted_at?: string | null }).deleted_at);
    const published = owned.filter(
      (p) =>
        String(p.profile_status || "") === "verified" ||
        String(p.moderation_status || "") === "approved"
    ).length;
    const pending = owned.filter(
      (p) => String(p.moderation_status || "") === "pending_review"
    ).length;
    const act = activityByUser.get(u.id) || {
      lastActivityAt: null,
      contactViewsCount: 0,
      savedProfilesCount: 0,
      sentInterestsCount: 0,
      profileViews: [],
      contactViews: [],
      savedProfiles: [],
      sentInterests: [],
    };
    const activeSub = activeSubByAuthId.get(u.id);
    const planDisplayName = (activeSub?.plan_id ? planNameById.get(String(activeSub.plan_id)) : undefined) || null;
    const currentPlanSummary = activeSub
      ? `${planDisplayName || "Active plan"} · till ${new Date(String(activeSub.expires_at || "")).toLocaleDateString("en-IN")}`
      : null;
    return {
      id: u.id,
      accountHolderName:
        String(u.user_metadata?.full_name || "").trim() ||
        String(u.user_metadata?.first_name || "").trim() ||
        "-",
      email: u.email || null,
      phone: u.phone || null,
      createdAt: u.created_at || null,
      lastActivityAt: act.lastActivityAt,
      contactViewsCount: act.contactViewsCount,
      savedProfilesCount: act.savedProfilesCount,
      sentInterestsCount: act.sentInterestsCount,
      profileCount: owned.length,
      publishedCount: published,
      pendingCount: pending,
      profiles: owned,
      currentPlanSummary,
      currentPlanName: planDisplayName,
      currentPlanExpiresAt: activeSub?.expires_at || null,
      currentPlanStatus: activeSub ? "active" : null,
      totalPaidInr: Math.round((totalPaidByAuthId.get(u.id) || 0) * 100) / 100,
      activity: {
        profileViews: act.profileViews
          .sort((a, b) => new Date(String(b.viewed_at || 0)).getTime() - new Date(String(a.viewed_at || 0)).getTime())
          .slice(0, 100),
        contactViews: act.contactViews
          .sort((a, b) => new Date(String(b.viewed_at || 0)).getTime() - new Date(String(a.viewed_at || 0)).getTime())
          .slice(0, 100),
        savedProfiles: act.savedProfiles
          .sort((a, b) => new Date(String(b.created_at || 0)).getTime() - new Date(String(a.created_at || 0)).getTime())
          .slice(0, 100),
        sentInterests: act.sentInterests
          .sort((a, b) => new Date(String(b.created_at || 0)).getTime() - new Date(String(a.created_at || 0)).getTime())
          .slice(0, 100),
      },
    };
  });

  const codedRows = rows.map((r) => ({ ...r, accountCode: codeByUser.get(r.id) || "U00001" }));

  const activityFloor = getFloor(activityRange);
  const filtered = codedRows.filter((r) => {
    const ts = (r as { lastActivityAt?: string | null }).lastActivityAt || null;
    if (!activityFloor && !customFrom && !customTo) return true;
    if (!ts) return false;
    const t = new Date(ts).getTime();
    if (activityFloor && t < new Date(activityFloor).getTime()) return false;
    if (!activityFloor && customFrom && t < new Date(customFrom).getTime()) return false;
    if (!activityFloor && customTo && t > new Date(customTo).getTime() + 24 * 60 * 60 * 1000 - 1) return false;
    return true;
  });

  if (userId) {
    const one = filtered.find((u) => u.id === userId);
    if (!one) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ user: one });
  }
  return NextResponse.json({ users: filtered });
}
