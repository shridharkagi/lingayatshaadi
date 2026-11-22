import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";

type Row = Record<string, unknown>;

function istMidnightUtc(now = new Date()) {
  const off = 5.5 * 3600 * 1000;
  const ist = new Date(now.getTime() + off);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - off).toISOString();
}

/**
 * Member 360°: everything about one account (auth user) — its profiles,
 * plan + quota usage, subscriptions, payments, upgrade requests, activity
 * timeline and internal notes.
 *   GET /api/superadmin/accounts/<authUserId>
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await ctx.params;
  const admin = createSupabaseAdmin();

  const { data: userData, error: userErr } = await admin.auth.admin.getUserById(id);
  if (userErr || !userData?.user) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  const u = userData.user;
  const meta = (u.user_metadata || {}) as Row;
  const appMeta = (u.app_metadata || {}) as Row;

  const [{ data: codeRow }, { data: profilesData }] = await Promise.all([
    admin.from("user_account_codes").select("account_code").eq("user_id", id).maybeSingle(),
    admin
      .from("profiles")
      .select(
        "id, public_id, full_name, gender, date_of_birth, city, profession, relationship, moderation_status, profile_status, deleted_at, is_blocked, profile_photo, created_at, approved_at, rejection_reason"
      )
      .eq("user_id", id)
      .order("created_at", { ascending: true }),
  ]);
  const profiles = (profilesData || []) as Row[];
  const profileIds = profiles.map((p) => String(p.id));
  const ownerIds = [id, ...profileIds];
  const nameById = new Map(profiles.map((p) => [String(p.id), String(p.full_name || "Profile")]));

  const nowIso = new Date().toISOString();
  const [subsRes, payRes, upgRes, notesRes, auditRes, cvRes, intRes] = await Promise.all([
    admin.from("user_subscriptions").select("*").in("user_id", ownerIds).order("created_at", { ascending: false }),
    admin.from("payment_transactions").select("*").in("user_id", ownerIds).order("created_at", { ascending: false }),
    admin.from("subscription_upgrade_requests").select("*").eq("user_id", id).order("created_at", { ascending: false }),
    admin.from("admin_notes").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(50),
    admin
      .from("admin_audit_logs")
      .select("action_type, entity_type, entity_id, created_at, meta")
      .in("entity_id", ownerIds)
      .order("created_at", { ascending: false })
      .limit(30),
    profileIds.length
      ? admin.from("contact_views").select("viewer_id, viewed_id, viewed_at").in("viewer_id", profileIds).order("viewed_at", { ascending: false }).limit(200)
      : Promise.resolve({ data: [] as Row[] }),
    profileIds.length
      ? admin.from("interests").select("from_id, to_id, status, created_at").in("from_id", profileIds).order("created_at", { ascending: false }).limit(30)
      : Promise.resolve({ data: [] as Row[] }),
  ]);

  // Older rows have no plan_name_snapshot and may point at the legacy
  // membership_plans table: resolve a display name from either table.
  const rawSubs = (subsRes.data || []) as Row[];
  const planIds = Array.from(new Set(rawSubs.map((x) => String(x.plan_id || "")).filter(Boolean)));
  const planNames = new Map<string, string>();
  if (planIds.length) {
    const [sp, mp] = await Promise.all([
      admin.from("subscription_plans").select("id, name").in("id", planIds),
      admin.from("membership_plans").select("id, name").in("id", planIds),
    ]);
    for (const r of [...((mp.data || []) as Row[]), ...((sp.data || []) as Row[])]) planNames.set(String(r.id), String(r.name));
  }
  const subs: Row[] = rawSubs.map((x) => ({
    ...x,
    plan_name_snapshot: x.plan_name_snapshot || planNames.get(String(x.plan_id || "")) || null,
  }));
  const active = subs.find(
    (s) => s.status === "active" && String(s.starts_at || "") <= nowIso && String(s.expires_at || "") >= nowIso
  );
  const contactViews = (cvRes.data || []) as Row[];
  const quota = active
    ? {
        planName: active.plan_name_snapshot || "Plan",
        startsAt: active.starts_at,
        expiresAt: active.expires_at,
        totalLimit: Number(active.total_contact_views_snapshot || 0),
        dailyLimit: Number(active.daily_contact_view_limit_snapshot || 0),
        totalUsed: contactViews.filter((c) => String(c.viewed_at) >= String(active.starts_at)).length,
        todayUsed: contactViews.filter((c) => String(c.viewed_at) >= istMidnightUtc()).length,
      }
    : null;

  // Per-profile engagement received.
  const engagement = await Promise.all(
    profileIds.map(async (pid) => {
      const [v, i, c] = await Promise.all([
        admin.from("profile_views").select("id", { count: "exact", head: true }).eq("viewed_id", pid),
        admin.from("interests").select("id", { count: "exact", head: true }).eq("to_id", pid),
        admin.from("contact_views").select("id", { count: "exact", head: true }).eq("viewed_id", pid),
      ]);
      return [pid, { views: v.count || 0, interests: i.count || 0, contactedBy: c.count || 0 }] as const;
    })
  );
  const engagementById = Object.fromEntries(engagement);

  // Names for profiles this account contacted / sent interest to.
  const targetIds = Array.from(
    new Set([...contactViews.slice(0, 15).map((c) => String(c.viewed_id)), ...((intRes.data || []) as Row[]).map((i) => String(i.to_id))])
  );
  const targets: Row[] = targetIds.length
    ? (((await admin.from("profiles").select("id, public_id, full_name").in("id", targetIds)).data || []) as Row[])
    : [];
  const targetName = new Map(targets.map((t) => [String(t.id), `${t.full_name || "Profile"}${t.public_id ? ` (${t.public_id})` : ""}`]));

  type Event = { at: string; kind: string; text: string; tone: string };
  const events: Event[] = [];
  events.push({ at: u.created_at, kind: "signup", text: "Account created (signed up)", tone: "indigo" });
  if (u.last_sign_in_at) events.push({ at: u.last_sign_in_at, kind: "login", text: "Last login", tone: "grey" });
  for (const p of profiles) {
    events.push({ at: String(p.created_at), kind: "profile", text: `Profile created: ${p.full_name || "—"}`, tone: "plum" });
    if (p.approved_at) events.push({ at: String(p.approved_at), kind: "approved", text: `Profile approved: ${p.full_name || "—"}`, tone: "green" });
  }
  for (const c of contactViews.slice(0, 15))
    events.push({
      at: String(c.viewed_at),
      kind: "contact",
      text: `${nameById.get(String(c.viewer_id)) || "Profile"} viewed contact of ${targetName.get(String(c.viewed_id)) || "a profile"}`,
      tone: "teal",
    });
  for (const i of (intRes.data || []) as Row[])
    events.push({
      at: String(i.created_at),
      kind: "interest",
      text: `Interest sent to ${targetName.get(String(i.to_id)) || "a profile"} · ${i.status}`,
      tone: "rose",
    });
  for (const pmt of (payRes.data || []) as Row[])
    events.push({
      at: String(pmt.paid_at || pmt.created_at),
      kind: "payment",
      text: `Payment ₹${Number(pmt.amount || 0).toLocaleString("en-IN")} · ${pmt.payment_mode || pmt.provider || ""} · ${pmt.status}`,
      tone: "green",
    });
  for (const r of (upgRes.data || []) as Row[])
    events.push({ at: String(r.created_at), kind: "upgrade", text: `Upgrade request: ${r.plan_name || r.plan_code || "plan"} · ${r.status}`, tone: "amber" });
  for (const a of (auditRes.data || []) as Row[])
    events.push({ at: String(a.created_at), kind: "admin", text: `Admin: ${String(a.action_type).replace(".", " → ")}`, tone: "grey" });
  events.sort((a, b) => b.at.localeCompare(a.at));

  return NextResponse.json({
    account: {
      id: u.id,
      phone: u.phone || null,
      name: String(meta.full_name || ""),
      gender: meta.gender || null,
      city: meta.city || null,
      dateOfBirth: meta.date_of_birth || meta.dob || null,
      accountCode: (codeRow as Row | null)?.account_code || null,
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at || null,
      suspended: appMeta.account_suspended === true,
    },
    profiles: profiles.map((p) => ({ ...p, engagement: engagementById[String(p.id)] || null })),
    quota,
    subscriptions: subs,
    payments: payRes.data || [],
    upgradeRequests: upgRes.data || [],
    notes: notesRes.data || [],
    timeline: events.slice(0, 40),
  });
}
