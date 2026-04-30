import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";
import { resolveAccountCodeMap } from "@/lib/server/accountCodes";
import { listAllAuthUsers } from "@/lib/server/authUsers";

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const q = (new URL(req.url).searchParams.get("q") || "").trim().toLowerCase();
  if (q.length < 2) return NextResponse.json({ items: [] });

  const admin = createSupabaseAdmin();
  const { data: superadminOwners } = await admin
    .from("profiles")
    .select("user_id")
    .eq("role", "superadmin")
    .is("deleted_at", null);
  const superadminUserIds = new Set<string>(
    (superadminOwners || [])
      .map((r) => String((r as { user_id?: string | null }).user_id || "").trim())
      .filter(Boolean)
  );
  // Ensure the currently authenticated superadmin account is always searchable,
  // even if its profile role row has not been seeded yet.
  superadminUserIds.add(auth.userId);

  let users;
  try {
    users = await listAllAuthUsers(admin);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not fetch users" },
      { status: 500 }
    );
  }
  const codeByUser = await resolveAccountCodeMap(
    admin,
    users.map((u) => ({ id: u.id, created_at: u.created_at }))
  );
  const items = users
    .map((u) => {
      const name =
        String((u.user_metadata?.full_name as string) || "").trim() ||
        String((u.user_metadata?.first_name as string) || "").trim() ||
        "User";
      const isAdmin = superadminUserIds.has(u.id);
      const displayName = name === "User" && isAdmin ? "Admin" : name;
      return {
        userId: u.id,
        accountCode: codeByUser.get(u.id) || "",
        name: displayName,
        email: u.email || null,
        phone: u.phone || null,
        isAdmin,
      };
    })
    .filter((u) => {
      const hay = `${u.accountCode} ${u.userId} ${u.name} ${u.email || ""} ${u.phone || ""} ${u.isAdmin ? "admin superadmin" : ""}`.toLowerCase();
      return hay.includes(q);
    })
    .slice(0, 20);

  return NextResponse.json({ items });
}

