import { notFound, redirect } from "next/navigation";
import { parseProfileSlug, parseShortProfileSlug } from "@/lib/memberId";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ShortProfileRedirectPage({ params }: PageProps) {
  const { slug } = await params;
  const cleaned = (slug || "").trim().toLowerCase();
  if (!cleaned) notFound();

  // Preferred new form: /p/lb260400025-deepika
  if (parseProfileSlug(cleaned)) {
    redirect(`/profile/${cleaned}`);
  }

  // Backward compatibility for old generated short links: /p/deepika-lb260400025
  const publicId = parseShortProfileSlug(slug);
  if (!publicId) {
    notFound();
  }

  const parts = cleaned.split("-").filter(Boolean);
  const namePart = parts.length > 1 ? parts.slice(0, -1).join("-") : "profile";
  redirect(`/profile/${publicId.toLowerCase()}-${namePart || "profile"}`);
}
