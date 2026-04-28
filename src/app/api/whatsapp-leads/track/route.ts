import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { getOptionalAuthUser } from "@/lib/server/getOptionalAuthUser";

const SOURCE_PAGES = new Set(["home", "search", "profile"]);
const EVENT_NAMES = new Set(["cta_impression", "form_opened", "submit_success"]);

type TrackBody = {
  sourcePage?: unknown;
  eventName?: unknown;
};

export async function POST(req: NextRequest) {
  let body: TrackBody;
  try {
    body = (await req.json()) as TrackBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sourcePage = typeof body.sourcePage === "string" ? body.sourcePage : "";
  const eventName = typeof body.eventName === "string" ? body.eventName : "";
  if (!SOURCE_PAGES.has(sourcePage) || !EVENT_NAMES.has(eventName)) {
    return NextResponse.json({ error: "Invalid tracking payload" }, { status: 400 });
  }

  const auth = await getOptionalAuthUser(req);
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("whatsapp_lead_events").insert({
    account_id: auth.userId,
    source_page: sourcePage,
    event_name: eventName,
  });
  if (error) {
    return NextResponse.json({ error: error.message || "Failed to track" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
