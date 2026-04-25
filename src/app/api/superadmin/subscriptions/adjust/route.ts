import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";
import { logAdminAudit } from "@/lib/server/adminAudit";

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await req.json()) as {
    subscriptionId?: string;
    expiresAt?: string;
    totalContactViews?: number;
    dailyContactViewLimit?: number;
    reason?: string;
  };
  if (!body.subscriptionId || !body.reason?.trim()) {
    return NextResponse.json(
      { error: "subscriptionId and reason are required" },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (body.expiresAt) updates.expires_at = body.expiresAt;
  if (body.totalContactViews != null) {
    updates.total_contact_views_snapshot = Math.max(0, Math.trunc(Number(body.totalContactViews)));
  }
  if (body.dailyContactViewLimit != null) {
    updates.daily_contact_view_limit_snapshot = Math.max(0, Math.trunc(Number(body.dailyContactViewLimit)));
  }

  const admin = createSupabaseAdmin();
  const { data: before, error: fetchErr } = await admin
    .from("user_subscriptions")
    .select("*")
    .eq("id", body.subscriptionId)
    .single();
  if (fetchErr || !before) {
    return NextResponse.json({ error: fetchErr?.message || "Subscription not found" }, { status: 404 });
  }

  const { data: updated, error: updErr } = await admin
    .from("user_subscriptions")
    .update(updates)
    .eq("id", body.subscriptionId)
    .select("*")
    .single();
  if (updErr || !updated) {
    return NextResponse.json({ error: updErr?.message || "Failed to update subscription" }, { status: 500 });
  }

  await logAdminAudit({
    actorUserId: auth.userId,
    action: "subscription.adjust_manual",
    entityType: "user_subscription",
    entityId: String(body.subscriptionId),
    beforeJson: before as Record<string, unknown>,
    afterJson: updated as Record<string, unknown>,
    meta: { reason: body.reason.trim() },
  });

  await admin.from("notifications").insert({
    user_id: String(updated.user_id),
    type: "general",
    title: "Subscription updated",
    message: "Your subscription details were updated by support.",
    read: false,
  });

  return NextResponse.json({ subscription: updated });
}
