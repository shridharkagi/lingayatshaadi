/**
 * Seed 10 brides + 10 grooms (with photos) under the super-admin account.
 *
 * - Looks up the auth user by phone (default: 9844497002 — change with env
 *   `SUPER_ADMIN_PHONE`).
 * - Upserts 20 demo profiles into the `profiles` table mapped to that user_id.
 * - Also writes the resulting SQL to `supabase-seed-superadmin-profiles.sql`
 *   so it can be re-run from the Supabase SQL editor without service-role
 *   credentials.
 *
 * Usage:
 *   # 1) Make sure these are set in .env.local (or your shell):
 *   #      NEXT_PUBLIC_SUPABASE_URL
 *   #      SUPABASE_SERVICE_ROLE_KEY
 *   #
 *   # 2) Run:
 *   npx tsx scripts/seed-superadmin-profiles.ts
 *   #    (use `npx tsx --env-file=.env.local scripts/seed-superadmin-profiles.ts`
 *   #     if your env vars live in .env.local)
 */

import { createClient } from "@supabase/supabase-js";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { mockProfiles } from "../src/data/mock";
import type { Profile, ProfileContact } from "../src/types";

const SUPER_ADMIN_PHONE = (process.env.SUPER_ADMIN_PHONE || "9844497002").replace(
  /\D/g,
  ""
);
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SQL_OUT = join(ROOT, "supabase-seed-superadmin-profiles.sql");

/**
 * Pick the first 10 female (brides) + first 10 male (grooms) profiles from
 * mock. Excludes the super-admin row itself (Shridhar Kagi / LS26010000) and
 * any profile that's missing a photo, so the seeded data is always rich.
 */
function pickDemoProfiles(): Profile[] {
  const isSuperAdmin = (p: Profile) =>
    p.publicId === "LS26010000" || (p.role === "superadmin");

  const withPhotos = mockProfiles.filter(
    (p) => !!p.profilePhoto && !isSuperAdmin(p)
  );

  const brides = withPhotos.filter((p) => p.gender === "female").slice(0, 10);
  const grooms = withPhotos.filter((p) => p.gender === "male").slice(0, 10);

  if (brides.length < 10) {
    throw new Error(`Only ${brides.length} brides with photos in mock data; need 10`);
  }
  if (grooms.length < 10) {
    throw new Error(`Only ${grooms.length} grooms with photos in mock data; need 10`);
  }

  return [...brides, ...grooms];
}

/**
 * Convert a legacy public_id (LS+YY+MM+NNNN, 10 chars) to the v2 format
 * (L[BG]+YY+MM+NNNNN, 11 chars). Idempotent for already-v2 IDs.
 *
 * Mirrors the SQL migration in `supabase-migrate-public-ids-v2.sql` so that
 * re-seeding upserts onto the same rows that migration produced.
 */
function toV2PublicId(legacyId: string | undefined, gender: Profile["gender"]): string {
  const id = (legacyId || "").toUpperCase().trim();
  if (/^L[BG]\d{9}$/.test(id)) return id;
  const flag = gender === "female" ? "B" : "G";
  if (/^LS\d{8}$/.test(id)) {
    const yy = id.slice(2, 4);
    const mm = id.slice(4, 6);
    const seq = id.slice(6, 10).padStart(5, "0");
    return `L${flag}${yy}${mm}${seq}`;
  }
  // Last resort: synthesise a stable-ish ID from the input string. Should
  // basically never happen because all mockProfiles have legacy LS public_ids.
  const yy = String(new Date().getFullYear()).slice(-2);
  const mm = String(new Date().getMonth() + 1).padStart(2, "0");
  const seq = String(Math.abs(hashString(id)) % 100000).padStart(5, "0");
  return `L${flag}${yy}${mm}${seq}`;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h;
}

/** Convert a Profile to a snake_case row ready for `profiles` insert/update. */
function toRow(p: Profile, userId: string): Record<string, unknown> {
  // Primary contact = super-admin phone (visible). The original profile-owner
  // contact is added as a (hidden) alternate so we don't lose the data.
  const primary: ProfileContact = {
    number: `+91 ${SUPER_ADMIN_PHONE}`,
    belongsTo: "Guardian",
    showOnProfile: true,
    methods: ["Call", "WhatsApp"],
  };
  const alt: ProfileContact | null = p.contact
    ? {
        number: p.contact,
        belongsTo: "Self",
        showOnProfile: false,
        methods: ["Call"],
      }
    : null;
  const contacts = alt ? [primary, alt] : [primary];

  return {
    user_id: userId,
    public_id: toV2PublicId(p.publicId || p.memberId, p.gender),
    email: p.email || `${(p.fullName || "demo").toLowerCase().replace(/\W+/g, "")}@demo.lingayatbandhu.com`,
    full_name: p.fullName,
    date_of_birth: p.dateOfBirth,
    gender: p.gender,
    marital_status: p.maritalStatus || "Never Married",
    caste: p.caste || "Lingayat",
    sub_caste: p.subCaste || "",
    height: p.height || "",
    languages_known: p.languagesKnown || null,
    mother_tongue: p.motherTongue || null,
    about_me: p.aboutMe || "",
    about_me_visible: p.aboutMeVisible ?? true,
    hobbies: p.hobbies || [],
    time_of_birth: p.timeOfBirth || null,
    place_of_birth: p.placeOfBirth || null,
    rashi: p.rashi || null,
    nakshatra: p.nakshatra || null,
    horoscope_other_details: p.horoscopeOtherDetails || null,
    qualification: p.qualification || null,
    profession_type: p.professionType || null,
    profession: p.profession || null,
    company_name: p.companyName || null,
    annual_income: p.annualIncome || null,
    father_name: p.fatherName || null,
    father_occupation: p.fatherOccupation || null,
    mother_name: p.motherName || null,
    mother_occupation: p.motherOccupation || null,
    food_habits: p.foodHabits || null,
    sibling_details: p.siblingDetails || null,
    family_other_details: p.familyOtherDetails || null,
    address: p.address || null,
    city: p.city || null,
    district: p.district || null,
    state: p.state || null,
    country: p.country || "India",
    contact: primary.number,
    contact_type: primary.belongsTo,
    contacts,
    profile_photo: p.profilePhoto || null,
    photos: p.photos || [],
    verified: p.verified ?? true,
    profile_status: p.profileStatus || "verified",
    profile_type: p.profileType || "premium",
    trust_score: p.trustScore ?? 80,
    managed_by: "admin",
    account_holder_name: "Admin",
    relationship: "other",
    nickname: p.fullName,
    partner_preference: p.partnerPreference || null,
  };
}

/** Escape a JS value into a SQL literal. */
function sqlLit(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  if (Array.isArray(v)) {
    if (v.length === 0) return "'{}'";
    if (typeof v[0] === "string") {
      const escaped = (v as string[]).map((s) =>
        '"' + s.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"'
      );
      return `'{${escaped.join(",")}}'`;
    }
    return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  }
  if (typeof v === "object") {
    return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  }
  // string/Date
  return `'${String(v).replace(/'/g, "''")}'`;
}

const SQL_COLUMNS = [
  "user_id",
  "public_id",
  "email",
  "full_name",
  "date_of_birth",
  "gender",
  "marital_status",
  "caste",
  "sub_caste",
  "height",
  "languages_known",
  "mother_tongue",
  "about_me",
  "about_me_visible",
  "hobbies",
  "time_of_birth",
  "place_of_birth",
  "rashi",
  "nakshatra",
  "horoscope_other_details",
  "qualification",
  "profession_type",
  "profession",
  "company_name",
  "annual_income",
  "father_name",
  "father_occupation",
  "mother_name",
  "mother_occupation",
  "food_habits",
  "sibling_details",
  "family_other_details",
  "address",
  "city",
  "district",
  "state",
  "country",
  "contact",
  "contact_type",
  "contacts",
  "profile_photo",
  "photos",
  "verified",
  "profile_status",
  "profile_type",
  "trust_score",
  "managed_by",
  "account_holder_name",
  "relationship",
  "nickname",
  "partner_preference",
];

function buildSql(rows: Array<Record<string, unknown>>): string {
  const lines: string[] = [];
  lines.push(`-- Auto-generated by scripts/seed-superadmin-profiles.ts`);
  lines.push(`-- Re-run safely: rows are upserted on public_id.`);
  lines.push(``);
  lines.push(`-- 1) Ensure required columns exist (safe to re-run).`);
  lines.push(`ALTER TABLE profiles`);
  lines.push(`  ADD COLUMN IF NOT EXISTS contacts JSONB DEFAULT '[]'::jsonb;`);
  lines.push(`ALTER TABLE profiles`);
  lines.push(`  ADD COLUMN IF NOT EXISTS relationship TEXT`);
  lines.push(`    CHECK (relationship IN ('self','son','daughter','brother','sister','other'));`);
  lines.push(`ALTER TABLE profiles`);
  lines.push(`  ADD COLUMN IF NOT EXISTS nickname TEXT;`);
  lines.push(``);
  lines.push(`-- Resolve the super-admin auth user by phone. The resulting CTE`);
  lines.push(`-- exposes a single column \`uid\` used by the INSERT below.`);
  lines.push(`WITH admin AS (`);
  lines.push(`  SELECT id AS uid FROM auth.users`);
  lines.push(`   WHERE regexp_replace(COALESCE(phone,''), '\\D', '', 'g') = '${SUPER_ADMIN_PHONE}'`);
  lines.push(`   LIMIT 1`);
  lines.push(`)`);
  lines.push(`INSERT INTO profiles (${SQL_COLUMNS.join(", ")})`);
  lines.push(`VALUES`);
  const valueRows = rows.map((r) => {
    const vals = SQL_COLUMNS.map((c) =>
      c === "user_id" ? "(SELECT uid FROM admin)" : sqlLit(r[c])
    );
    return `  (${vals.join(", ")})`;
  });
  lines.push(valueRows.join(",\n"));
  lines.push(`ON CONFLICT (public_id) DO UPDATE SET`);
  const updates = SQL_COLUMNS.filter((c) => c !== "user_id" && c !== "public_id").map(
    (c) => `  ${c} = EXCLUDED.${c}`
  );
  lines.push(updates.join(",\n"));
  lines.push(`;`);
  lines.push(``);
  return lines.join("\n");
}

async function main() {
  const profiles = pickDemoProfiles();
  console.log(
    `[seed] Picked ${profiles.length} demo profiles (${profiles.filter((p) => p.gender === "female").length} brides + ${profiles.filter((p) => p.gender === "male").length} grooms).`
  );

  // Build SQL fallback regardless of whether we run the live insert. Use a
  // placeholder uid (NULL) here so the file always works even before we know
  // the user_id; the WITH CTE resolves it at run-time inside Supabase.
  const placeholderRows = profiles.map((p) => toRow(p, "PLACEHOLDER_UID"));
  writeFileSync(SQL_OUT, buildSql(placeholderRows), "utf8");
  console.log(`[seed] SQL fallback written to ${SQL_OUT}`);

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.warn(
      `[seed] NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing — skipping live insert.\n        Run the generated SQL file in the Supabase SQL editor instead.`
    );
    return;
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Look up super-admin user by phone.
  const { data: users, error: listErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listErr) {
    console.error(`[seed] Failed to list users:`, listErr.message);
    process.exit(1);
  }
  const match = users.users.find((u) => {
    const digits = (u.phone || "").replace(/\D/g, "");
    return digits.endsWith(SUPER_ADMIN_PHONE);
  });
  if (!match) {
    console.error(
      `[seed] No auth user found for phone ${SUPER_ADMIN_PHONE}. Sign up that account first, then re-run.`
    );
    process.exit(1);
  }
  console.log(`[seed] Super-admin user_id = ${match.id} (phone ${match.phone})`);

  const rows = profiles.map((p) => toRow(p, match.id));

  /**
   * Try the upsert with the rich row first. If the live DB doesn't yet have
   * the `contacts` JSONB column (or the relationship/nickname columns), strip
   * them and retry — and tell the user to run the migration files for full
   * functionality.
   */
  const tryUpsert = async (rowsToInsert: Array<Record<string, unknown>>) =>
    admin
      .from("profiles")
      .upsert(rowsToInsert, { onConflict: "public_id", count: "exact" });

  let result = await tryUpsert(rows);
  if (result.error && /Could not find the '(contacts|relationship|nickname)'/i.test(result.error.message)) {
    const missing = result.error.message.match(/'(contacts|relationship|nickname)'/i)?.[1];
    console.warn(
      `[seed] Live DB is missing column "${missing}". Stripping it and retrying.\n        Run \`supabase-profiles-contacts.sql\` and \`supabase-profiles-relationship.sql\` in the Supabase SQL editor for full data.`
    );
    const stripped = rows.map((r) => {
      const copy: Record<string, unknown> = { ...r };
      delete copy.contacts;
      delete copy.relationship;
      delete copy.nickname;
      return copy;
    });
    result = await tryUpsert(stripped);
  }

  if (result.error) {
    console.error(`[seed] Upsert failed:`, result.error.message);
    if ((result.error as { details?: string }).details) {
      console.error(`[seed] Details:`, (result.error as { details?: string }).details);
    }
    process.exit(1);
  }
  console.log(`[seed] Upserted ${result.count ?? rows.length} demo profiles successfully.`);

  // Sanity-print the file for visibility.
  if (existsSync(SQL_OUT)) {
    const stats = readFileSync(SQL_OUT, "utf8").split("\n").length;
    console.log(`[seed] (SQL fallback file is ${stats} lines)`);
  }
}

main().catch((err) => {
  console.error(`[seed] Unhandled error:`, err);
  process.exit(1);
});
