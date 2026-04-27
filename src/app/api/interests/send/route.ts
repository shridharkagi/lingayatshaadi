import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireAuthUser } from "@/lib/server/requireAuthUser";

export async function POST(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await req.json()) as {
    fromProfileId?: string;
    toProfileId?: string;
    message?: string;
    fromName?: string;
  };
  if (!body.fromProfileId || !body.toProfileId) {
    return NextResponse.json({ error: "fromProfileId and toProfileId are required" }, { status: 400 });
  }
  if (body.fromProfileId === body.toProfileId) {
    return NextResponse.json({ error: "Cannot send interest to the same profile" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();

  const [{ data: senderProfile }, { count: nonDeletedProfileCount }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, user_id")
      .eq("id", body.fromProfileId)
      .single(),
    admin
      .from("profiles")
      .select("id", { head: true, count: "exact" })
      .eq("user_id", auth.userId)
      .is("deleted_at", null),
  ]);

  if (!senderProfile || senderProfile.user_id !== auth.userId) {
    return NextResponse.json({ error: "Unauthorized sender profile" }, { status: 403 });
  }
  if (Number(nonDeletedProfileCount || 0) < 1) {
    return NextResponse.json({ error: "Create your profile to send interests." }, { status: 403 });
  }

  const { data: targetProfile } = await admin
    .from("profiles")
    .select("id, user_id")
    .eq("id", body.toProfileId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!targetProfile) {
    return NextResponse.json({ error: "Target profile not found" }, { status: 404 });
  }

  const { data: existingActiveInterest } = await admin
    .from("interests")
    .select("id")
    .eq("from_id", body.fromProfileId)
    .eq("to_id", body.toProfileId)
    .in("status", ["pending", "accepted"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingActiveInterest) {
    return NextResponse.json(
      {
        error:
          "Interest already sent. If needed, undo it from Activities > Interests > Sent.",
      },
      { status: 409 }
    );
  }

  const { data, error } = await admin
    .from("interests")
    .insert({
      from_id: body.fromProfileId,
      to_id: body.toProfileId,
      message: body.message?.trim() || null,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (targetProfile.user_id) {
    const who = body.fromName?.trim() || "Someone";
    await admin.from("notifications").insert({
      user_id: targetProfile.user_id,
      type: "interest_received",
      title: "New Interest",
      message: `${who} sent you an interest`,
      read: false,
    });
  }

  return NextResponse.json({ interest: data });
}
