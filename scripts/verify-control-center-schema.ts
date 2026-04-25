import { createClient } from "@supabase/supabase-js";

type CheckResult = {
  name: string;
  ok: boolean;
  detail?: string;
};

const REQUIRED_TABLES = [
  "admin_audit_logs",
  "profile_moderation_events",
  "profile_trash",
  "subscription_plans",
  "user_subscriptions",
  "payment_transactions",
  "manual_payment_receipts",
  "profile_kyc_documents",
  "subscription_notification_logs",
  "subscription_upgrade_requests",
  "profile_deletion_requests",
] as const;

const REQUIRED_PROFILE_COLUMNS = [
  "deleted_at",
  "deleted_reason",
  "deleted_note",
  "deleted_by",
  "is_blocked",
  "blocked_reason",
  "blocked_at",
  "blocked_by",
] as const;

function env(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function main() {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRole = env("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const results: CheckResult[] = [];

  for (const table of REQUIRED_TABLES) {
    const { error } = await supabase.from(table).select("*", { count: "exact", head: true });
    results.push({
      name: `table:${table}`,
      ok: !error,
      detail: error?.message,
    });
  }

  for (const column of REQUIRED_PROFILE_COLUMNS) {
    const { error } = await supabase
      .from("profiles")
      .select(column, { count: "exact", head: true })
      .limit(1);
    results.push({
      name: `profiles.column:${column}`,
      ok: !error,
      detail: error?.message,
    });
  }

  const failures = results.filter((r) => !r.ok);
  for (const r of results) {
    const status = r.ok ? "OK" : "FAIL";
    // Keep output stable for CI parsing.
    console.log(`[${status}] ${r.name}${r.detail ? ` :: ${r.detail}` : ""}`);
  }

  if (failures.length > 0) {
    console.error("");
    console.error(
      `Schema verification failed: ${failures.length} check(s) failed.\n` +
        "Run supabase-superadmin-control-center.sql (and if needed supabase-profile-deletion-requests.sql) in the target database."
    );
    process.exit(1);
  }

  console.log("");
  console.log("Control-center schema verification passed.");
}

main().catch((err) => {
  console.error("Schema verification crashed:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
