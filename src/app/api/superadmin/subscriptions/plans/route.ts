import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";
import { logAdminAudit } from "@/lib/server/adminAudit";
const isMissingRelation = (msg?: string) =>
  !!msg && (msg.includes("does not exist") || msg.includes("schema cache"));

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("subscription_plans")
    .select("*")
    .order("price", { ascending: true });
  if (error && !isMissingRelation(error.message)) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    plans: data || [],
    setupWarning: error ? "subscription_plans table is not created yet." : null,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = (await req.json()) as {
    id?: string;
    code?: string;
    name?: string;
    durationDays?: number;
    price?: number;
    currency?: string;
    features?: string[];
    totalContactViews?: number;
    dailyContactViewLimit?: number;
    isActive?: boolean;
  };
  if (!body.code || !body.name || !body.durationDays || body.price == null) {
    return NextResponse.json(
      { error: "code, name, durationDays and price are required" },
      { status: 400 }
    );
  }
  if (body.totalContactViews == null || body.dailyContactViewLimit == null) {
    return NextResponse.json(
      { error: "totalContactViews and dailyContactViewLimit are required" },
      { status: 400 }
    );
  }
  const admin = createSupabaseAdmin();
  const payload = {
    code: body.code,
    name: body.name,
    duration_days: body.durationDays,
    price: body.price,
    currency: body.currency || "INR",
    features: body.features || [],
    total_contact_views: Math.max(0, Math.trunc(Number(body.totalContactViews))),
    daily_contact_view_limit: Math.max(0, Math.trunc(Number(body.dailyContactViewLimit))),
    is_active: body.isActive ?? true,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await admin
    .from("subscription_plans")
    .upsert(payload, { onConflict: "code" })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAdminAudit({
    actorUserId: auth.userId,
    action: "subscription.plan_update",
    entityType: "subscription_plan",
    entityId: String(data.id),
    afterJson: payload as Record<string, unknown>,
  });
  return NextResponse.json({ plan: data });
}
