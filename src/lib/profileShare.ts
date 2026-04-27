import type { Profile } from "@/types";
import { getAge } from "@/lib/utils";
import { getShortProfileSlug } from "@/lib/memberId";

function getFirstName(fullName?: string | null): string {
  return (fullName || "").trim().split(/\s+/)[0] || "Member";
}

/**
 * WhatsApp (and a few other share targets) can duplicate URLs when both the
 * `text` field and `url` field include the same link. Keep text URL-free.
 */
export function buildProfileShareText(
  profile: Pick<Profile, "fullName" | "dateOfBirth" | "profession" | "city">
): string {
  const firstName = getFirstName(profile.fullName);
  const age = profile.dateOfBirth ? String(getAge(profile.dateOfBirth)) : "";
  const profession = (profile.profession || "").trim();
  const city = (profile.city || "").trim();

  const line = [firstName, age, profession, city].filter(Boolean).join(", ");

  return `Found a genuine Lingayat profile:\n${line}\n\nView Profile:`;
}

export function getShortProfilePath(profile: Profile): string {
  return `/p/${getShortProfileSlug(profile)}`;
}
