import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";

type Row = Record<string, unknown>;
type Check = { level: "ok" | "warn" | "info"; title: string; detail: string };

const CONTACT_IN_TEXT = /(\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}|@[a-z0-9.-]+\.[a-z]{2,}|wa\.me|whatsapp/i;
const TEXT_FIELDS = ["about_me", "family_other_details", "horoscope_other_details", "sibling_details"];

function ageFrom(dob: unknown): number | null {
  if (typeof dob !== "string" || !dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

/**
 * Unified review queue for the admin Review workspace:
 *   - profile items: new submissions and edits after approval (with the
 *     approved snapshot for diffing), account info and automatic checks
 *   - photos items: pending photos on profiles that are not themselves pending
 *   - kyc items: pending KYC documents (short-lived signed URLs)
 */
export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const admin = createSupabaseAdmin();

  const [pendingRes, photosRes, kycRes] = await Promise.all([
    admin
      .from("profiles")
      .select("*")
      .eq("moderation_status", "pending_review")
      .is("deleted_at", null)
      .order("last_submitted_at", { ascending: true, nullsFirst: true }),
    admin.from("profile_photos").select("*").eq("status", "pending").order("uploaded_at", { ascending: true }),
    admin.from("profile_kyc_documents").select("*").eq("status", "pending").order("created_at", { ascending: true }),
  ]);
  const err = pendingRes.error || photosRes.error || kycRes.error;
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });

  const pending = (pendingRes.data || []) as Row[];
  const pendingPhotos = (photosRes.data || []) as Row[];
  const pendingKyc = (kycRes.data || []) as Row[];
  const pendingIds = new Set(pending.map((p) => String(p.id)));

  // Profiles referenced by photo / KYC items that are not in the pending list.
  const otherIds = Array.from(
    new Set(
      [...pendingPhotos, ...pendingKyc].map((r) => String(r.profile_id)).filter((id) => id && !pendingIds.has(id))
    )
  );
  const others: Row[] = otherIds.length
    ? (((await admin.from("profiles").select("*").in("id", otherIds)).data || []) as Row[])
    : [];
  const allProfiles = [...pending, ...others];
  const profileById = new Map(allProfiles.map((p) => [String(p.id), p]));

  // All photos for profiles in the queue (to show approved + pending together).
  const allIds = allProfiles.map((p) => String(p.id));
  const photoRows: Row[] = allIds.length
    ? (((await admin
        .from("profile_photos")
        .select("id, profile_id, url, status, is_primary, sort_order, uploaded_at, rejection_reason")
        .in("profile_id", allIds)
        .order("sort_order", { ascending: true })).data || []) as Row[])
    : [];
  const photosByProfile = new Map<string, Row[]>();
  for (const ph of photoRows) {
    const k = String(ph.profile_id);
    photosByProfile.set(k, [...(photosByProfile.get(k) || []), ph]);
  }

  // Account info for owners.
  const userIds = Array.from(new Set(allProfiles.map((p) => String(p.user_id || "")).filter(Boolean)));
  const [codesRes, ownedRes] = await Promise.all([
    userIds.length
      ? admin.from("user_account_codes").select("user_id, account_code").in("user_id", userIds)
      : Promise.resolve({ data: [] as Row[] }),
    userIds.length
      ? admin.from("profiles").select("id, user_id").in("user_id", userIds).is("deleted_at", null)
      : Promise.resolve({ data: [] as Row[] }),
  ]);
  const codeByUser = new Map(((codesRes.data || []) as Row[]).map((r) => [String(r.user_id), String(r.account_code)]));
  const countByUser = new Map<string, number>();
  for (const r of (ownedRes.data || []) as Row[]) {
    const k = String(r.user_id);
    countByUser.set(k, (countByUser.get(k) || 0) + 1);
  }
  const usersById = new Map<string, { phone: string | null; phoneConfirmed: boolean; name: string }>();
  await Promise.all(
    userIds.map(async (uid) => {
      const { data } = await admin.auth.admin.getUserById(uid);
      const u = data?.user;
      if (u)
        usersById.set(uid, {
          phone: u.phone || null,
          phoneConfirmed: Boolean(u.phone_confirmed_at),
          name: String((u.user_metadata as Row | undefined)?.full_name || ""),
        });
    })
  );

  // Duplicate candidates: same DOB + gender among other live profiles.
  const dobs = Array.from(new Set(pending.map((p) => String(p.date_of_birth || "")).filter(Boolean)));
  const dupRows: Row[] = dobs.length
    ? (((await admin
        .from("profiles")
        .select("id, public_id, full_name, date_of_birth, gender, city, user_id")
        .in("date_of_birth", dobs)
        .is("deleted_at", null)).data || []) as Row[])
    : [];

  const account = (p: Row) => {
    const uid = String(p.user_id || "");
    const u = usersById.get(uid);
    return {
      userId: uid,
      accountCode: codeByUser.get(uid) || null,
      phone: u?.phone || null,
      name: u?.name || "",
      profileCount: countByUser.get(uid) || 0,
    };
  };

  const checksFor = (p: Row): Check[] => {
    const checks: Check[] = [];
    const u = usersById.get(String(p.user_id || ""));
    checks.push(
      u?.phoneConfirmed
        ? { level: "ok", title: "Phone verified", detail: "Signed up with OTP" }
        : { level: "warn", title: "Phone not verified", detail: "No confirmed phone on the account" }
    );
    const age = ageFrom(p.date_of_birth);
    if (age === null) checks.push({ level: "warn", title: "No date of birth", detail: "Age can't be checked" });
    else if (age < 18 || age > 70) checks.push({ level: "warn", title: `Age ${age}`, detail: "Outside 18–70" });
    else checks.push({ level: "ok", title: `Age ${age}`, detail: "Within 18–70" });

    const dups = dupRows.filter(
      (d) =>
        String(d.id) !== String(p.id) &&
        d.date_of_birth === p.date_of_birth &&
        d.gender === p.gender &&
        String(d.user_id || "") !== String(p.user_id || "")
    );
    if (dups.length)
      checks.push({
        level: "warn",
        title: "Possible duplicate",
        detail: `Same DOB and gender as ${dups.map((d) => d.public_id || d.full_name).slice(0, 3).join(", ")}`,
      });
    else checks.push({ level: "ok", title: "No duplicates found", detail: "Checked DOB + gender" });

    const hit = TEXT_FIELDS.find((f) => typeof p[f] === "string" && CONTACT_IN_TEXT.test(String(p[f])));
    if (hit)
      checks.push({
        level: "warn",
        title: "Contact details in text",
        detail: `Phone/email/WhatsApp found in “${hit.replace(/_/g, " ")}”`,
      });

    const photos = photosByProfile.get(String(p.id)) || [];
    const approved = photos.filter((ph) => ph.status === "approved").length;
    const pend = photos.filter((ph) => ph.status === "pending").length;
    checks.push(
      approved + pend === 0
        ? { level: "warn", title: "No photos", detail: "Profile has no photo" }
        : { level: "info", title: `${approved} approved · ${pend} pending photos`, detail: "Review new photos below" }
    );
    return checks;
  };

  const summary = (p: Row) => ({
    id: String(p.id),
    publicId: (p.public_id as string) || null,
    name: (p.full_name as string) || "Unnamed",
    gender: (p.gender as string) || null,
    city: (p.city as string) || null,
    profession: (p.profession as string) || null,
    age: ageFrom(p.date_of_birth),
    relationship: (p.relationship as string) || null,
    photo: (p.profile_photo as string) || null,
  });

  const items: Row[] = [];
  for (const p of pending) {
    items.push({
      key: `profile:${p.id}`,
      type: p.approved_snapshot ? "edit" : "new",
      submittedAt: p.last_submitted_at || p.updated_at || p.created_at,
      profile: summary(p),
      account: account(p),
      checks: checksFor(p),
      live: p,
      snapshot: p.approved_snapshot || null,
      photos: photosByProfile.get(String(p.id)) || [],
    });
  }
  const photoGroups = new Map<string, Row[]>();
  for (const ph of pendingPhotos) {
    const k = String(ph.profile_id);
    if (pendingIds.has(k)) continue; // reviewed together with the profile
    photoGroups.set(k, [...(photoGroups.get(k) || []), ph]);
  }
  for (const [pid, phs] of photoGroups) {
    const p = profileById.get(pid);
    if (!p || p.deleted_at) continue;
    items.push({
      key: `photos:${pid}`,
      type: "photo",
      submittedAt: phs[0]?.uploaded_at,
      profile: summary(p),
      account: account(p),
      checks: [],
      photos: photosByProfile.get(pid) || phs,
    });
  }
  const kycGroups = new Map<string, Row[]>();
  for (const k of pendingKyc) {
    const pid = String(k.profile_id);
    kycGroups.set(pid, [...(kycGroups.get(pid) || []), k]);
  }
  for (const [pid, docs] of kycGroups) {
    const p = profileById.get(pid);
    if (!p || p.deleted_at) continue;
    const withUrls = await Promise.all(
      docs.map(async (d) => {
        let url = (d.url as string) || null;
        if (d.storage_path) {
          const signed = await admin.storage
            .from("profile-kyc-documents")
            .createSignedUrl(String(d.storage_path), 600);
          url = signed.data?.signedUrl || url;
        }
        return {
          id: d.id,
          idType: d.id_type,
          fileType: d.file_type,
          fileName: d.file_name,
          url,
          createdAt: d.created_at,
        };
      })
    );
    items.push({
      key: `kyc:${pid}`,
      type: "kyc",
      submittedAt: docs[0]?.created_at,
      profile: summary(p),
      account: account(p),
      checks: [],
      docs: withUrls,
    });
  }

  items.sort((a, b) => String(a.submittedAt || "").localeCompare(String(b.submittedAt || "")));
  return NextResponse.json({ items });
}
