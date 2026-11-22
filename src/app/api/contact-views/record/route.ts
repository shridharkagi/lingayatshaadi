import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireAuthUser } from "@/lib/server/requireAuthUser";
import { accountProfileIds, getAccountAccess } from "@/lib/server/plans";

const DAILY_LIMIT_MESSAGE =
  "You have reached today's contact view limit. Please try again tomorrow.";
const TOTAL_LIMIT_MESSAGE =
  "Your plan's total contact view limit is exhausted. Please upgrade or contact support for assistance.";
const EXPIRED_OR_NONE_MESSAGE =
  "You need an active plan to view contact details. Please upgrade or contact support.";

export async function POST(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await req.json()) as { viewerProfileId?: string; viewedProfileId?: string };
  if (!body.viewerProfileId || !body.viewedProfileId) {
    return NextResponse.json({ error: "viewerProfileId and viewedProfileId are required" }, { status: 400 });
  }
  if (body.viewerProfileId === body.viewedProfileId) {
    return NextResponse.json({ ok: true, recorded: false });
  }

  const admin = createSupabaseAdmin();
  // Quota is per ACCOUNT (all its profiles, including deleted ones).
  const ownIds = await accountProfileIds(admin, auth.userId);
  if (!ownIds.includes(body.viewerProfileId)) {
    return NextResponse.json({ error: "Unauthorized profile access" }, { status: 403 });
  }

  // Already revealed by any profile on this account → no charge, no re-count.
  const { data: existing } = await admin
    .from("contact_views")
    .select("id")
    .in("viewer_id", ownIds)
    .eq("viewed_id", body.viewedProfileId)
    .limit(1);

  if (!existing || existing.length === 0) {
    const access = await getAccountAccess(admin, auth.userId, ownIds);
    if (!access.usable) {
      return NextResponse.json({ error: EXPIRED_OR_NONE_MESSAGE, code: "SUBSCRIPTION_REQUIRED" }, { status: 403 });
    }
    const { totalLimit, dailyLimit, usage } = access;

    if (dailyLimit !== null && usage.todayUsed >= dailyLimit) {
      await admin.from("notifications").insert({
        user_id: auth.userId,
        type: "general",
        title: "Daily contact limit reached",
        message: DAILY_LIMIT_MESSAGE,
        read: false,
      });
      return NextResponse.json({ error: DAILY_LIMIT_MESSAGE, code: "DAILY_LIMIT_REACHED" }, { status: 403 });
    }

    if (totalLimit !== null && usage.totalUsed >= totalLimit) {
      await admin.from("notifications").insert({
        user_id: auth.userId,
        type: "general",
        title: "Contact limit exhausted",
        message: TOTAL_LIMIT_MESSAGE,
        read: false,
      });
      return NextResponse.json({ error: TOTAL_LIMIT_MESSAGE, code: "TOTAL_LIMIT_REACHED" }, { status: 403 });
    }

    const { error } = await admin.from("contact_views").insert({
      viewer_id: body.viewerProfileId,
      viewed_id: body.viewedProfileId,
      viewed_at: new Date().toISOString(),
    });
    // 23505 = a parallel request recorded it first; treat as already revealed.
    if (error && error.code !== "23505") return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Contacts are only released here, after the plan/quota checks above.
  // Only numbers the owner marked "show on profile" are returned.
  const { data: viewed } = await admin
    .from("profiles")
    .select("contacts, contact, contact_type, deleted_at, is_blocked")
    .eq("id", body.viewedProfileId)
    .maybeSingle();
  if (!viewed || viewed.deleted_at || viewed.is_blocked) {
    return NextResponse.json({ error: "Profile not available" }, { status: 404 });
  }
  type ContactEntry = { number?: string; showOnProfile?: boolean };
  const contacts = (Array.isArray(viewed.contacts) ? (viewed.contacts as ContactEntry[]) : []).filter(
    (c) => c && c.number && c.showOnProfile !== false
  );
  return NextResponse.json({
    ok: true,
    recorded: true,
    contacts,
    // Legacy single-number fallback, used only when no structured list exists.
    contact: contacts.length === 0 ? viewed.contact || null : null,
    contactType: contacts.length === 0 ? viewed.contact_type || null : null,
  });
}
