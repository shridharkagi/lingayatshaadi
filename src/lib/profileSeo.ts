import type { Profile } from "@/types";
import { getAge } from "@/lib/utils";

/**
 * SEO / share title pattern:
 * `[First Name], [Age] - [City] | LingayatShaadi.in`
 */
export function buildProfileSeoTitle(profile: Pick<Profile, "fullName" | "dateOfBirth" | "city">): string {
  const first = (profile.fullName || "").trim().split(/\s+/)[0] || "Member";
  const age = profile.dateOfBirth ? getAge(profile.dateOfBirth) : "—";
  const city = (profile.city || "").trim() || "India";
  return `${first}, ${age} - ${city} | LingayatShaadi.in`;
}

export function buildProfileSeoDescription(
  profile: Pick<Profile, "fullName" | "dateOfBirth" | "height" | "profession" | "city" | "state" | "qualification">
): string {
  const name = ((profile.fullName || "Member").trim().split(/\s+/)[0] || "Member");
  const age = profile.dateOfBirth ? getAge(profile.dateOfBirth) : "";
  const bits = [
    age ? `${age} yrs` : "",
    profile.height ? `${profile.height}"` : "",
    profile.profession || "",
    [profile.city, profile.state].filter(Boolean).join(", "),
    profile.qualification || "",
  ].filter(Boolean);
  return `${name} — ${bits.join(" · ")}. View this Lingayat matrimonial profile on LingayatShaadi.in.`;
}
