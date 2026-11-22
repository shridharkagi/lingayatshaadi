import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";
import {
  PlanError,
  createPlanTemplate,
  setPlanArchived,
  updatePlanTemplate,
  type TemplateInput,
} from "@/lib/server/plans";

/**
 * Plan templates: POST { action: "create" | "update" | "archive" | "restore",
 *   planId?, reason, name?, price?, durationDays?, totalContacts?, dailyLimit?, isActive?, sortOrder? }
 * Changing a template never changes plans members already have.
 */
export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = (await req.json().catch(() => ({}))) as TemplateInput & { action?: string; planId?: string; reason?: string; code?: string };
  const reason = (body.reason || "").trim();
  if (!reason) return NextResponse.json({ error: "Please add a reason for this change" }, { status: 400 });
  const ctx = { actorId: auth.userId, reason };
  const admin = createSupabaseAdmin();
  try {
    if (body.action === "create") {
      return NextResponse.json({ plan: await createPlanTemplate(admin, body, ctx) });
    }
    if (!body.planId) return NextResponse.json({ error: "planId is required" }, { status: 400 });
    if (body.action === "update") return NextResponse.json({ plan: await updatePlanTemplate(admin, body.planId, body, ctx) });
    if (body.action === "archive") return NextResponse.json({ plan: await setPlanArchived(admin, body.planId, true, ctx) });
    if (body.action === "restore") return NextResponse.json({ plan: await setPlanArchived(admin, body.planId, false, ctx) });
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    const status = e instanceof PlanError ? e.status : 500;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status });
  }
}
