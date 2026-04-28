import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

export async function getOptionalAuthUser(req: NextRequest): Promise<{ userId: string | null }> {
  const authHeader = req.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return { userId: null };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return { userId: null };

  const anonClient = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await anonClient.auth.getUser(match[1]);
  if (error || !data.user) return { userId: null };
  return { userId: data.user.id };
}
