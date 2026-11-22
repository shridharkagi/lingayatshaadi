#!/usr/bin/env node
/**
 * Copy Prod's database (auth accounts + all public tables) into Test.
 * Prod is only READ. Test is WIPED and replaced, in a single transaction.
 *
 *   node --env-file=.env.local scripts/sync-prod-to-test.mjs           # dry run: counts only
 *   node --env-file=.env.local scripts/sync-prod-to-test.mjs --apply   # do it
 *
 * Needs `pg` (npm i -D pg) and SUPABASE_DB_PASSWORD (Test) /
 * SUPABASE_PROD_DB_PASSWORD (falls back to SUPABASE_DB_PASSWORD).
 *
 * Not copied: storage files (photo URLs point at Prod storage and still
 * display; KYC files will not open on Test), pending OTP challenges,
 * auth sessions. After copying, Test's robots.txt is set to Disallow all.
 */
import pg from "pg";

const PROD = { host: "aws-1-ap-south-1.pooler.supabase.com", ref: "sqvfzvjalmcznsohxgfh" };
const TEST = { host: "aws-1-ap-northeast-1.pooler.supabase.com", ref: "fubapvscyehvplalhfqv" };
const SKIP_TABLES = new Set(["phone_otp_challenges"]);
const AUTH_TABLES = ["users", "identities"];
const BATCH = 500;
const apply = process.argv.includes("--apply");

function client({ host, ref }, password) {
  return new pg.Client({
    host, port: 5432, database: "postgres", user: `postgres.${ref}`, password,
    ssl: { rejectUnauthorized: false },
  });
}

async function columns(c, schema, table) {
  const { rows } = await c.query(
    `select column_name, data_type from information_schema.columns
      where table_schema=$1 and table_name=$2 and is_generated <> 'ALWAYS'
      order by ordinal_position`,
    [schema, table]
  );
  return rows;
}

async function publicTables(c) {
  const { rows } = await c.query(
    `select table_name from information_schema.tables
      where table_schema='public' and table_type='BASE TABLE' order by 1`
  );
  return rows.map((r) => r.table_name);
}

async function copyTable(prod, test, schema, table) {
  const pc = await columns(prod, schema, table);
  const tc = new Map((await columns(test, schema, table)).map((r) => [r.column_name, r.data_type]));
  const cols = pc.filter((r) => tc.has(r.column_name));
  if (cols.length === 0) return 0;
  const names = cols.map((r) => `"${r.column_name}"`).join(", ");
  const { rows } = await prod.query(`select ${names} from "${schema}"."${table}"`);
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const params = [];
    const tuples = chunk.map((row) => {
      const ph = cols.map((col) => {
        let v = row[col.column_name];
        if (v !== null && (col.data_type === "json" || col.data_type === "jsonb")) v = JSON.stringify(v);
        params.push(v);
        return `$${params.length}`;
      });
      return `(${ph.join(", ")})`;
    });
    await test.query(
      `insert into "${schema}"."${table}" (${names}) overriding system value values ${tuples.join(", ")}`,
      params
    );
  }
  return rows.length;
}

async function count(c, schema, table) {
  try {
    return Number((await c.query(`select count(*) n from "${schema}"."${table}"`)).rows[0].n);
  } catch {
    return null;
  }
}

const testPw = process.env.SUPABASE_DB_PASSWORD;
const prodPw = process.env.SUPABASE_PROD_DB_PASSWORD || testPw;
if (!testPw) throw new Error("SUPABASE_DB_PASSWORD missing");

const prod = client(PROD, prodPw);
const test = client(TEST, testPw);
await prod.connect();
await test.connect();

const prodTables = await publicTables(prod);
const testTables = new Set(await publicTables(test));
const tables = prodTables.filter((t) => testTables.has(t) && !SKIP_TABLES.has(t));
const missingOnTest = prodTables.filter((t) => !testTables.has(t));

const before = {};
for (const t of AUTH_TABLES) before[`auth.${t}`] = await count(test, "auth", t);
for (const t of tables) before[t] = await count(test, "public", t);

if (!apply) {
  console.log("DRY RUN. Tables to copy:", tables.length, "| missing on Test:", missingOnTest.join(", ") || "none");
  for (const [k, v] of Object.entries(before)) {
    const [s, t] = k.includes(".") ? k.split(".") : ["public", k];
    console.log(`  ${k.padEnd(32)} test=${v}  prod=${await count(prod, s, t)}`);
  }
  await prod.end(); await test.end();
  process.exit(0);
}

try {
  await test.query("begin");
  // 1. Wipe Test (normal mode so FK cascades clean up dependent auth rows).
  await test.query(`truncate ${tables.map((t) => `public."${t}"`).join(", ")} cascade`);
  await test.query("delete from auth.users");
  // 2. Copy with triggers/FK checks off (rows are already consistent on Prod).
  await test.query("set local session_replication_role = replica");
  const copied = {};
  for (const t of AUTH_TABLES) copied[`auth.${t}`] = await copyTable(prod, test, "auth", t);
  for (const t of tables) copied[t] = await copyTable(prod, test, "public", t);
  // 3. Bump sequences past copied ids.
  const { rows: seqs } = await test.query(`
    select s.relname seq, t.relname tbl, a.attname col
      from pg_class s join pg_depend d on d.objid = s.oid
      join pg_class t on t.oid = d.refobjid
      join pg_attribute a on a.attrelid = t.oid and a.attnum = d.refobjsubid
      join pg_namespace n on n.oid = s.relnamespace
     where s.relkind = 'S' and n.nspname = 'public'`);
  for (const s of seqs) {
    await test.query(
      `select setval('public."${s.seq}"', greatest(coalesce((select max("${s.col}") from public."${s.tbl}"), 0), 1))`
    );
  }
  // 4. Keep Test out of search engines.
  await test.query(
    `update public.site_settings
        set config = jsonb_set(coalesce(config::jsonb, '{}'::jsonb), '{robotsTxt}', to_jsonb('User-agent: *' || chr(10) || 'Disallow: /'::text))`
  );
  await test.query("commit");
  console.log("SYNC DONE (Test now mirrors Prod)\n");
  console.log("table".padEnd(34) + "before".padStart(8) + "after".padStart(8) + "prod".padStart(8));
  for (const k of Object.keys(before)) {
    const [s, t] = k.includes(".") ? k.split(".") : ["public", k];
    console.log(
      k.padEnd(34) + String(before[k]).padStart(8) + String(await count(test, s, t)).padStart(8) +
      String(await count(prod, s, t)).padStart(8)
    );
  }
  if (missingOnTest.length) console.log("\nNot on Test (skipped):", missingOnTest.join(", "));
} catch (e) {
  await test.query("rollback").catch(() => {});
  console.error("FAILED, Test left unchanged:", e.message);
  process.exitCode = 1;
} finally {
  await prod.end();
  await test.end();
}
