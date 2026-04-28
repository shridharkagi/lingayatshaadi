import { adminFetch } from "@/lib/api/adminClient";

export type WhatsAppLeadSourcePage = "home" | "search" | "profile";

type SubmitPayload = {
  name: string;
  contactNo: string;
  city: string;
  sourcePage: WhatsAppLeadSourcePage;
  turnstileToken?: string;
};

export async function getWhatsAppLeadStatus(): Promise<{ shouldShowCta: boolean }> {
  const res = await adminFetch("/api/whatsapp-leads/status");
  if (!res.ok) return { shouldShowCta: true };
  const json = (await res.json()) as { shouldShowCta?: boolean };
  return { shouldShowCta: json.shouldShowCta !== false };
}

export async function submitWhatsAppLead(payload: SubmitPayload): Promise<{ ok: boolean; error?: string }> {
  const res = await adminFetch("/api/whatsapp-leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) return { ok: false, error: json.error || "Failed to submit lead" };
  return { ok: true };
}

export async function trackWhatsAppLeadEvent(
  sourcePage: WhatsAppLeadSourcePage,
  eventName: "cta_impression" | "form_opened" | "submit_success"
): Promise<void> {
  await adminFetch("/api/whatsapp-leads/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourcePage, eventName }),
  }).catch(() => undefined);
}
