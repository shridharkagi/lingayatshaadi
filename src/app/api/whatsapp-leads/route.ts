import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { sanitizeText } from "@/lib/security";
import { normalizeIndianPhone } from "@/lib/phoneAuth";
import { requireTurnstileForRequest } from "@/lib/server/turnstile";
import { getOptionalAuthUser } from "@/lib/server/getOptionalAuthUser";

const SOURCE_PAGES = new Set(["home", "search", "profile"]);
const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;

type LeadBody = {
  name?: unknown;
  contactNo?: unknown;
  city?: unknown;
  sourcePage?: unknown;
  turnstileToken?: unknown;
};

export async function POST(req: NextRequest) {
  let body: LeadBody;
  try {
    body = (await req.json()) as LeadBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sourcePage = typeof body.sourcePage === "string" ? body.sourcePage : "";
  if (!SOURCE_PAGES.has(sourcePage)) {
    return NextResponse.json({ error: "Invalid source page" }, { status: 400 });
  }

  const auth = await getOptionalAuthUser(req);
  if (!auth.userId) {
    const captchaError = await requireTurnstileForRequest(req, body, {
      route: "whatsapp-leads",
    });
    if (captchaError) return captchaError;
  }

  const name = sanitizeText(typeof body.name === "string" ? body.name : "").slice(0, 100);
  const city = sanitizeText(typeof body.city === "string" ? body.city : "").slice(0, 80);
  const parsedPhone = normalizeIndianPhone(typeof body.contactNo === "string" ? body.contactNo : "");
  if (!name || name.length < 2) {
    return NextResponse.json({ error: "Please enter your full name" }, { status: 400 });
  }
  if (!parsedPhone) {
    return NextResponse.json({ error: "Enter a valid 10-digit Indian mobile number" }, { status: 400 });
  }
  if (!city || city.length < 2) {
    return NextResponse.json({ error: "Please enter your city" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const duplicateSince = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString();
  const dedupe = await admin
    .from("whatsapp_leads")
    .select("id, status, created_at")
    .eq("contact_no", parsedPhone.e164)
    .eq("source_page", sourcePage)
    .gte("created_at", duplicateSince)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (dedupe.data?.id) {
    return NextResponse.json({
      ok: true,
      alreadyJoined: dedupe.data.status === "submitted",
      deduped: true,
    });
  }

  if (auth.userId) {
    const prior = await admin
      .from("whatsapp_leads")
      .select("id")
      .eq("account_id", auth.userId)
      .eq("status", "submitted")
      .limit(1)
      .maybeSingle();
    if (prior.data?.id) {
      return NextResponse.json({ ok: true, alreadyJoined: true, deduped: true });
    }
  }

  const { error } = await admin.from("whatsapp_leads").insert({
    account_id: auth.userId,
    name,
    contact_no: parsedPhone.e164,
    city,
    source_page: sourcePage,
    status: "submitted",
    metadata: {
      cityProvided: city,
      submittedFrom: sourcePage,
      ip:
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        null,
    },
  });
  if (error) {
    return NextResponse.json({ error: error.message || "Failed to submit lead" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    alreadyJoined: false,
    deduped: false,
    normalizedContactNo: parsedPhone.e164,
  });
}
