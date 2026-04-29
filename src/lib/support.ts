/** Canonical support channels (shown in UI, legal pages, and emails). */
export const SUPPORT_EMAIL = "LingayatBandhu@gmail.com";
export const SUPPORT_PHONE_DISPLAY = "6360130905";
export const SUPPORT_WHATSAPP_DISPLAY = "6360130905";

export function supportTelHref(): string {
  return `tel:${SUPPORT_PHONE_DISPLAY.replace(/\D/g, "")}`;
}

export function supportWhatsAppHref(prefill?: string): string {
  const n = SUPPORT_WHATSAPP_DISPLAY.replace(/\D/g, "");
  const text = prefill ?? `Hello, I need help with LingayatBandhu.`;
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}
