import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";

type Row = Record<string, unknown>;

const istMidnightUtc = () => {
  const ist = new Date(Date.now() + 5.5 * 3600000);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - 5.5 * 3600000).toISOString();
};
const age = (dob: unknown) => {
  if (!dob) return null;
  const d = new Date(String(dob));
  if (Number.isNaN(d.getTime())) return null;
  const n = new Date();
  return n.getFullYear() - d.getFullYear() - (n < new Date(n.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
};

/**
 * Every contact this account revealed (across all its profiles, incl. deleted ones),
 * newest first, plus a usage summary against the active plan. GET
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await ctx.params;
  const admin = createSupabaseAdmin();

  const { data: own } = await admin.from("profiles").select("id, public_id, full_name, deleted_at").eq("user_id", id);
  const ownProfiles = (own || []) as Row[];
  const ownIds = ownProfiles.map((p) => String(p.id));
  if (ownIds.length === 0) return NextResponse.json({ rows: [], summary: { total: 0, today: 0, sincePlan: 0, plan: null } });

  const [{ data: cvData, error }, { data: subRows }] = await Promise.all([
    admin.from("contact_views").select("viewer_id, viewed_id, viewed_at").in("viewer_id", ownIds).order("viewed_at", { ascending: false }).limit(1000),
    admin
      .from("admin_subscriptions_v")
      .select("plan_display_name, starts_at, expires_at, total_contact_views_snapshot, daily_contact_view_limit_snapshot")
      .eq("account_id", id)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: false })
      .limit(1),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const views = (cvData || []) as Row[];

  const viewedIds = [...new Set(views.map((v) => String(v.viewed_id)))];
  const { data: viewedData } = viewedIds.length
    ? await admin
        .from("profiles")
        .select("id, public_id, full_name, gender, date_of_birth, city, district, profession, profile_photo, moderation_status, deleted_at, user_id")
        .in("id", viewedIds)
    : { data: [] };
  const viewed = new Map(((viewedData || []) as Row[]).map((p) => [String(p.id), p]));
  const byId = new Map(ownProfiles.map((p) => [String(p.id), p]));

  const rows = views.map((v) => {
    const p = viewed.get(String(v.viewed_id));
    const by = byId.get(String(v.viewer_id));
    return {
      viewedAt: v.viewed_at,
      profile: p
        ? {
            id: p.id, publicId: p.public_id, name: p.full_name, gender: p.gender, age: age(p.date_of_birth),
            city: p.city || p.district, profession: p.profession, photo: p.profile_photo,
            status: p.deleted_at ? "deleted" : p.moderation_status, accountId: p.user_id,
          }
        : { id: v.viewed_id, publicId: null, name: "Profile removed", status: "deleted" },
      by: by ? { id: by.id, publicId: by.public_id, name: by.full_name, deleted: !!by.deleted_at } : null,
    };
  });

  const plan = (subRows || [])[0] as Row | undefined;
  const today = istMidnightUtc();
  return NextResponse.json({
    rows,
    summary: {
      total: views.length,
      today: views.filter((v) => String(v.viewed_at) >= today).length,
      sincePlan: plan ? views.filter((v) => String(v.viewed_at) >= String(plan.starts_at)).length : 0,
      plan: plan
        ? {
            name: plan.plan_display_name, startsAt: plan.starts_at, expiresAt: plan.expires_at,
            totalLimit: Number(plan.total_contact_views_snapshot || 0) || null,
            dailyLimit: Number(plan.daily_contact_view_limit_snapshot || 0) || null,
          }
        : null,
    },
  });
}
