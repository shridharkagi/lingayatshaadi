import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";

type Row = { viewed_id?: string; viewer_id?: string; created_at?: string; viewed_at?: string };
type ProfileLite = {
  id: string;
  public_id: string | null;
  full_name: string | null;
  city: string | null;
  qualification: string | null;
};

const isMissingRelation = (msg?: string) =>
  !!msg && (msg.includes("does not exist") || msg.includes("schema cache"));

function aggregateTopProfiles(rows: Row[]): Array<{ profileId: string; count: number }> {
  const map = new Map<string, number>();
  for (const r of rows) {
    const id = r.viewed_id;
    if (!id) continue;
    map.set(id, (map.get(id) || 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([profileId, count]) => ({ profileId, count }));
}

function aggregateTopViewers(rows: Row[]): Array<{ userId: string; count: number; profileIds: string[] }> {
  const counts = new Map<string, number>();
  const contactedProfilesByViewer = new Map<string, Set<string>>();
  for (const r of rows) {
    const viewerId = r.viewer_id;
    const viewedId = r.viewed_id;
    if (!viewerId) continue;
    counts.set(viewerId, (counts.get(viewerId) || 0) + 1);
    if (viewedId) {
      if (!contactedProfilesByViewer.has(viewerId)) contactedProfilesByViewer.set(viewerId, new Set<string>());
      contactedProfilesByViewer.get(viewerId)?.add(viewedId);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([userId, count]) => ({
      userId,
      count,
      profileIds: [...(contactedProfilesByViewer.get(userId) || new Set<string>())],
    }));
}

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const admin = createSupabaseAdmin();
    const [viewsRes, contactsRes, logsRes] = await Promise.all([
      admin.from("profile_views").select("viewed_id, viewer_id, viewed_at").limit(5000),
      admin.from("contact_views").select("viewed_id, viewer_id, viewed_at").limit(5000),
      admin
        .from("admin_audit_logs")
        .select("id, action_type, entity_type, entity_id, actor_user_id, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    if (viewsRes.error) return NextResponse.json({ error: viewsRes.error.message }, { status: 500 });
    if (contactsRes.error) {
      return NextResponse.json({ error: contactsRes.error.message }, { status: 500 });
    }
    if (logsRes.error && !isMissingRelation(logsRes.error.message)) {
      return NextResponse.json({ error: logsRes.error.message }, { status: 500 });
    }
    const { data: profiles } = await admin
      .from("profiles")
      .select("gender");
    const now = new Date().toISOString();
    const [subsActive, subsExpired, subsPending, paidTx] = await Promise.all([
      admin.from("user_subscriptions").select("id", { head: true, count: "exact" }).eq("status", "active").gte("expires_at", now),
      admin.from("user_subscriptions").select("id", { head: true, count: "exact" }).lt("expires_at", now),
      admin.from("user_subscriptions").select("id", { head: true, count: "exact" }).eq("status", "pending"),
      admin.from("payment_transactions").select("amount,status"),
    ]);
    const brides = (profiles || []).filter((p) => (p as { gender?: string }).gender === "female").length;
    const grooms = (profiles || []).filter((p) => (p as { gender?: string }).gender === "male").length;
    const collected = (paidTx.data || [])
      .filter((t) => (t as { status?: string }).status === "paid")
      .reduce((s, t) => s + Number((t as { amount?: number }).amount || 0), 0);

    const topViewedRaw = aggregateTopProfiles((viewsRes.data || []) as Row[]);
    const topContactedRaw = aggregateTopProfiles((contactsRes.data || []) as Row[]);
    const topViewersRaw = aggregateTopViewers((contactsRes.data || []) as Row[]);

    const profileIdsToFetch = new Set<string>();
    for (const row of topViewedRaw) profileIdsToFetch.add(row.profileId);
    for (const row of topContactedRaw) profileIdsToFetch.add(row.profileId);
    for (const viewer of topViewersRaw) {
      profileIdsToFetch.add(viewer.userId);
      for (const pId of viewer.profileIds) profileIdsToFetch.add(pId);
    }

    const profileMap = new Map<string, ProfileLite>();
    if (profileIdsToFetch.size > 0) {
      const { data: profileRows, error: profileError } = await admin
        .from("profiles")
        .select("id, public_id, full_name, city, qualification")
        .in("id", [...profileIdsToFetch]);
      if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });
      for (const row of (profileRows || []) as ProfileLite[]) {
        profileMap.set(row.id, row);
      }
    }

    const normalizeProfile = (profileId: string) => {
      const p = profileMap.get(profileId);
      return {
        profileId,
        publicId: p?.public_id || null,
        fullName: p?.full_name || "Unknown member",
        city: p?.city || "",
        education: p?.qualification || "",
      };
    };

    return NextResponse.json({
      topViewedProfiles: topViewedRaw.map((row) => ({
        ...normalizeProfile(row.profileId),
        count: row.count,
      })),
      topContactedProfiles: topContactedRaw.map((row) => ({
        ...normalizeProfile(row.profileId),
        count: row.count,
      })),
      topContactViewers: topViewersRaw.map((viewer) => {
        const viewerProfile = normalizeProfile(viewer.userId);
        return {
          userId: viewer.userId,
          userPublicId: viewerProfile.publicId,
          userName: viewerProfile.fullName,
          count: viewer.count,
          profiles: viewer.profileIds.map((profileId) => normalizeProfile(profileId)),
        };
      }),
      recentAdminActions: logsRes.data || [],
      setupWarning: logsRes.error ? "admin_audit_logs table is not created yet." : null,
      totals: {
        profileViews: (viewsRes.data || []).length,
        contactViews: (contactsRes.data || []).length,
      },
      kpis: {
        brides,
        grooms,
        activeSubscriptions: subsActive.count || 0,
        expiredSubscriptions: subsExpired.count || 0,
        pendingSubscriptions: subsPending.count || 0,
        totalPaymentsCollected: collected,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
