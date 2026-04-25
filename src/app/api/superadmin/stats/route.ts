/**
 * Super-admin stats endpoint.
 *
 * GET /api/superadmin/stats?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Returns aggregate counts for the dashboard:
 *   - signups   (auth.users created in range)
 *   - profiles  (profiles created in range)
 *   - brides / grooms                          (gender split)
 *   - verified / pending / rejected / suspended (status split)
 *   - premium / free                            (subscription type split)
 *   - relationship breakdown (self/son/daughter/brother/sister/other)
 *
 * `from` / `to` are inclusive ISO dates. Both optional — omit for "all time".
 *
 * Auth: caller must present a valid Supabase access token via the
 * `Authorization: Bearer <jwt>` header. The user is allowed if EITHER:
 *   1. They have a profile row with `role = 'superadmin'`, OR
 *   2. Their phone matches the configured `SUPER_ADMIN_PHONE`
 *      (env, defaults to "9844497002" for legacy compatibility).
 *
 * Implementation notes:
 *   - We use the service-role client to bypass RLS for aggregate queries.
 *   - auth.users counts come from `auth.admin.listUsers()` paginated up to
 *     20k users, which is plenty at our current scale. Beyond that we should
 *     add a SQL `get_admin_stats()` function.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";

interface RangeFilter {
  from?: string; // inclusive ISO date YYYY-MM-DD
  to?: string;   // inclusive ISO date YYYY-MM-DD
}

interface StatsResponse {
  range: RangeFilter;
  signups: number;
  profiles: number;
  brides: number;
  grooms: number;
  status: {
    verified: number;
    pending: number;
    rejected: number;
    suspended: number;
  };
  type: {
    premium: number;
    free: number;
  };
  relationship: Record<string, number>;
  // Optional preview slice for "Recent Registrations" cards.
  recent: Array<{
    id: string;
    publicId: string | null;
    fullName: string;
    gender: string | null;
    profilePhoto: string | null;
    createdAt: string;
  }>;
}

function parseRange(req: NextRequest): RangeFilter {
  const url = new URL(req.url);
  const from = url.searchParams.get("from") || undefined;
  const to = url.searchParams.get("to") || undefined;
  const isIso = (s: string | undefined) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
  return {
    from: isIso(from) ? from : undefined,
    to: isIso(to) ? to : undefined,
  };
}

/**
 * Convert "YYYY-MM-DD" inclusive bounds into ISO timestamps usable in
 * PostgREST `gte`/`lte` filters on `created_at`.
 */
function toTimestampBounds(range: RangeFilter): { fromTs?: string; toTs?: string } {
  const fromTs = range.from ? `${range.from}T00:00:00.000Z` : undefined;
  // Add a day so that "to" is inclusive of the entire day.
  let toTs: string | undefined;
  if (range.to) {
    const d = new Date(`${range.to}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    toTs = d.toISOString();
  }
  return { fromTs, toTs };
}

async function countAuthSignups(fromTs?: string, toTs?: string): Promise<number> {
  // auth.admin.listUsers doesn't accept a date filter, so we paginate and
  // filter in memory. Up to 20k users (20 pages × 1000) — fine for now.
  const admin = createSupabaseAdmin();
  let total = 0;
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) {
      console.warn("[stats] listUsers error:", error.message);
      break;
    }
    const users = data.users || [];
    for (const u of users) {
      const created = u.created_at;
      if (!created) continue;
      if (fromTs && created < fromTs) continue;
      if (toTs && created >= toTs) continue;
      total += 1;
    }
    if (users.length < 1000) break;
  }
  return total;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireSuperAdmin(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const range = parseRange(req);
    const { fromTs, toTs } = toTimestampBounds(range);

    const admin = createSupabaseAdmin();

    // Aggregate scan: narrow columns, no ORDER BY (avoids full-table sort).
    // Recent registrations: small ordered slice in parallel with signups + aggregate.
    let aggQ = admin
      .from("profiles")
      .select("id, gender, profile_status, verified, profile_type, relationship");
    if (fromTs) aggQ = aggQ.gte("created_at", fromTs);
    if (toTs) aggQ = aggQ.lt("created_at", toTs);

    let recentQ = admin
      .from("profiles")
      .select("id, public_id, full_name, gender, profile_photo, created_at");
    if (fromTs) recentQ = recentQ.gte("created_at", fromTs);
    if (toTs) recentQ = recentQ.lt("created_at", toTs);
    recentQ = recentQ.order("created_at", { ascending: false }).limit(6);

    const [signups, aggRes, recentRes] = await Promise.all([
      countAuthSignups(fromTs, toTs),
      aggQ,
      recentQ,
    ]);

    const { data: rows, error } = aggRes;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result: StatsResponse = {
      range,
      signups: 0,
      profiles: rows?.length || 0,
      brides: 0,
      grooms: 0,
      status: { verified: 0, pending: 0, rejected: 0, suspended: 0 },
      type: { premium: 0, free: 0 },
      relationship: {},
      recent: [],
    };

    for (const r of rows || []) {
      const row = r as {
        id: string;
        public_id: string | null;
        full_name: string | null;
        gender: string | null;
        profile_status: string | null;
        verified: boolean | null;
        profile_type: string | null;
        relationship: string | null;
        created_at: string;
        profile_photo: string | null;
      };

      if (row.gender === "female") result.brides += 1;
      else if (row.gender === "male") result.grooms += 1;

      const status = (row.profile_status as keyof StatsResponse["status"]) ||
        (row.verified ? "verified" : "pending");
      if (status in result.status) {
        result.status[status as keyof StatsResponse["status"]] += 1;
      }

      if (row.profile_type === "premium") result.type.premium += 1;
      else result.type.free += 1;

      const rel = row.relationship || "self";
      result.relationship[rel] = (result.relationship[rel] || 0) + 1;
    }

    const recentSource = !recentRes.error && recentRes.data ? recentRes.data : [];
    result.recent = recentSource.slice(0, 6).map((r) => {
      const row = r as Record<string, unknown>;
      return {
        id: String(row.id),
        publicId: (row.public_id as string | null) || null,
        fullName: (row.full_name as string | null) || "",
        gender: (row.gender as string | null) || null,
        profilePhoto: (row.profile_photo as string | null) || null,
        createdAt: (row.created_at as string) || "",
      };
    });

    result.signups = signups;

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load stats" },
      { status: 500 }
    );
  }
}
