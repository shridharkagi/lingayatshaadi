import { createSupabaseClientSafe } from "@/lib/supabase";

export async function adminFetch(path: string, init?: RequestInit): Promise<Response> {
  const supabase = createSupabaseClientSafe();
  const headers = new Headers(init?.headers || {});
  if (supabase) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(path, { ...init, headers, cache: "no-store" });
}
