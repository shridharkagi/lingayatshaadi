import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("subscription_plans")
    .select(
      "id, code, name, duration_days, price, currency, features, total_contact_views, daily_contact_view_limit, is_active"
    )
    .eq("is_active", true)
    .order("price", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ plans: data || [] });
}
