import { ImageResponse } from "next/og";
import { fetchProfileForSeo } from "@/lib/server/fetchProfileForSeo";
import { getPublicSiteUrl, absolutePublicAssetUrl } from "@/lib/siteUrl";
import { getProfileSlug } from "@/lib/memberId";

export const alt = "LingayatBandhu profile preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

type Props = {
  params: Promise<{ id: string }>;
};

function subtitle(profile: Awaited<ReturnType<typeof fetchProfileForSeo>>) {
  if (!profile) return "Lingayat matrimony profile";
  const parts: string[] = [];
  if (profile.dateOfBirth) {
    const dob = new Date(profile.dateOfBirth);
    if (!Number.isNaN(dob.getTime())) {
      const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (age > 0 && age < 100) parts.push(`${age} yrs`);
    }
  }
  if (profile.city) parts.push(profile.city);
  if (parts.length === 0 && profile.profession) parts.push(profile.profession);
  return parts.join(" • ") || "Lingayat matrimony profile";
}

export default async function ProfileOpenGraphImage({ params }: Props) {
  const { id } = await params;
  const siteUrl = getPublicSiteUrl();
  const profile = await fetchProfileForSeo(id);
  const fallback = `${siteUrl}/og/lingayatbandhu-og-home-v2.png`;
  const photoUrl = profile?.profilePhoto
    ? absolutePublicAssetUrl(siteUrl, profile.profilePhoto)
    : fallback;
  const name = profile?.fullName?.trim() || "LingayatBandhu";
  const detail = subtitle(profile);
  const profileUrl = profile ? `${siteUrl}/profile/${getProfileSlug(profile)}` : `${siteUrl}/profile/${id}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "linear-gradient(120deg, #1f1b17 0%, #3b220f 45%, #7a3a05 100%)",
          color: "#fff",
          overflow: "hidden",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <img
          src={photoUrl}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.25,
            filter: "blur(12px) saturate(1.1)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(18,12,8,0.88) 0%, rgba(18,12,8,0.62) 45%, rgba(18,12,8,0.45) 100%)",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            width: "100%",
            height: "100%",
            padding: "48px 56px",
            alignItems: "center",
            gap: 44,
          }}
        >
          <div
            style={{
              width: 360,
              height: 534,
              borderRadius: 28,
              overflow: "hidden",
              border: "2px solid rgba(255,255,255,0.22)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
              display: "flex",
              flexShrink: 0,
              background: "#2b2b2b",
            }}
          >
            <img
              src={photoUrl}
              alt={name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 690 }}>
            <div style={{ fontSize: 26, letterSpacing: 0.6, color: "rgba(255,255,255,0.88)", marginBottom: 16 }}>
              LINGAYATBANDHU MATRIMONY
            </div>
            <div
              style={{
                fontSize: 62,
                fontWeight: 800,
                lineHeight: 1.03,
                letterSpacing: -1.2,
                maxWidth: 660,
                textWrap: "balance",
              }}
            >
              {name}
            </div>
            <div style={{ marginTop: 18, fontSize: 32, color: "rgba(255,255,255,0.9)" }}>{detail}</div>
            <div
              style={{
                marginTop: 28,
                display: "inline-flex",
                alignItems: "center",
                width: "fit-content",
                borderRadius: 999,
                padding: "12px 20px",
                background: "rgba(234, 88, 12, 0.92)",
                color: "#fff",
                fontSize: 24,
                fontWeight: 700,
              }}
            >
              View Profile
            </div>
            <div style={{ marginTop: 20, fontSize: 18, color: "rgba(255,255,255,0.72)", maxWidth: 650 }}>
              {profileUrl.replace(/^https?:\/\//, "")}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
