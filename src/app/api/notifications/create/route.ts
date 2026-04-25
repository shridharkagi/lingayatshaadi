import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";

/** Create a notification for a user (uses service role, bypasses RLS) */
export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const body = await request.json();
    const { userId, type, title, message } = body as {
      userId?: string;
      type?: string;
      title?: string;
      message?: string;
    };

    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { error: "Missing userId, type, title, or message" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      type,
      title,
      message,
      read: false,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create notification" },
      { status: 500 }
    );
  }
}
