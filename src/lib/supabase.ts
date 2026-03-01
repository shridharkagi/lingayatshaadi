import { createClient } from "@supabase/supabase-js";

/** Client for browser (uses anon key) */
export function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("supabaseUrl and supabaseAnonKey are required");
  }
  
  return createClient(supabaseUrl, supabaseAnonKey);
}

/** Server-only client with service role (bypasses RLS) */
export function createSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for server-side uploads");
  }
  
  return createClient(supabaseUrl, supabaseServiceRoleKey);
}
