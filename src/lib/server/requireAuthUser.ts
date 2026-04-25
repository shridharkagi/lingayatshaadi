import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

type AuthResult =
  | { ok: true; userId: string }
  | { ok: false; status: number; error: string };

export async function requireAuthUser(req: NextRequest): Promise<AuthResult> {
  const authHeader = req.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return { ok: false, status: 401, error: "Missing Authorization: Bearer <token>" };
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return { ok: false, status: 500, error: "Supabase env not configured" };
  }
  const anonClient = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await anonClient.auth.getUser(match[1]);
  if (error || !data.user) {
    return { ok: false, status: 401, error: error?.message || "Invalid token" };
  }
  return { ok: true, userId: data.user.id };
}
