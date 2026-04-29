/**
 * Public site origin for canonical URLs, Open Graph, and Twitter cards.
 * Set `NEXT_PUBLIC_SITE_URL` in production (e.g. https://lingayatbandhu.com).
 */
export function getPublicSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    const noTrail = raw.replace(/\/$/, "");
    if (noTrail.startsWith("http://") || noTrail.startsWith("https://")) return noTrail;
    // Allow Vercel value like "test.lingayatbandhu.com" without scheme
    return `https://${noTrail.replace(/^\/+/, "")}`;
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "");
    return `https://${host}`;
  }
  return "https://test.lingayatbandhu.com";
}

/** Absolute URL for OG / Twitter (handles relative paths and protocol-relative). */
export function absolutePublicAssetUrl(siteUrl: string, pathOrUrl: string | null | undefined): string {
  const base = siteUrl.replace(/\/$/, "");
  if (!pathOrUrl) return `${base}/opengraph-image`;
  const s = pathOrUrl.trim();
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  const path = s.startsWith("/") ? s : `/${s}`;
  return `${base}${path}`;
}
