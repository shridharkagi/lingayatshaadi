/**
 * Admin-editable WhatsApp pre-filled messages for the upgrade buttons.
 * Stored in site_settings.config.whatsappTemplates; empty or missing keys
 * fall back to the defaults below. Placeholders use {curly} names and are
 * filled with fillWhatsAppTemplate(). Safe to import on client and server.
 */

export type WhatsAppTemplateKey =
  | "upgradeFromProfile"
  | "upgradePlan"
  | "upgradeHelp"
  | "freePlan"
  | "upgradeRequest";

export type WhatsAppTemplates = Record<WhatsAppTemplateKey, string>;

export const WHATSAPP_TEMPLATE_DEFAULTS: WhatsAppTemplates = {
  upgradeFromProfile:
    "Hi, my account ID is {accountId} and my name is {name}. I would like to upgrade my LingayatBandhu membership plan. Please share details.",
  upgradePlan: "Hi, I want to upgrade to {plan} (₹{price}) plan. Please assist with manual payment and activation.",
  upgradeHelp: "My name is {name}, I would like to upgrade my account.",
  freePlan: "Hi, I'm {name}. I'd like to get started with the Free plan on LingayatBandhu — please help me activate it.",
  upgradeRequest:
    "Upgrade Request\nAccount ID: {accountId}\nName: {name}\nPlan: {plan} ({planCode})\nPrice: INR {price}\nCallback: {callback}\nNote: {note}",
};

/**
 * Shown in the admin settings page, in this order. In every message {accountId}
 * is the logged-in account's code (U…) and {name} the account holder's name —
 * never the profile being viewed.
 */
export const WHATSAPP_TEMPLATE_FIELDS: {
  key: WhatsAppTemplateKey;
  label: string;
  where: string;
  placeholders: string[];
}[] = [
  {
    key: "upgradeFromProfile",
    label: "Upgrade Plan popup (profile page)",
    where: "Profile page → “Upgrade Plan” → WhatsApp button",
    placeholders: ["accountId", "name"],
  },
  {
    key: "upgradePlan",
    label: "Upgrade button on a plan",
    where: "Membership page → “Upgrade” on a plan card",
    placeholders: ["name", "plan", "price"],
  },
  {
    key: "upgradeRequest",
    label: "Submit Upgrade Request",
    where: "Membership page → “Submit Upgrade Request” (opens WhatsApp after saving the request)",
    placeholders: ["accountId", "name", "plan", "planCode", "price", "callback", "note"],
  },
  {
    key: "upgradeHelp",
    label: "Need upgrade help?",
    where: "Membership page → “Need upgrade help?” → WhatsApp",
    placeholders: ["name"],
  },
  {
    key: "freePlan",
    label: "Free plan",
    where: "Membership page → Free plan button",
    placeholders: ["name"],
  },
];

const MAX_TEMPLATE_LENGTH = 1000;

/** Only the messages that differ from the defaults (what we persist). */
export function whatsAppTemplateOverrides(t: WhatsAppTemplates): Partial<WhatsAppTemplates> {
  const out: Partial<WhatsAppTemplates> = {};
  for (const key of Object.keys(WHATSAPP_TEMPLATE_DEFAULTS) as WhatsAppTemplateKey[]) {
    if (t[key] && t[key] !== WHATSAPP_TEMPLATE_DEFAULTS[key]) out[key] = t[key];
  }
  return out;
}

/** Merge stored overrides with defaults; ignores unknown keys and blank values. */
export function normalizeWhatsAppTemplates(raw: unknown): WhatsAppTemplates {
  const out: WhatsAppTemplates = { ...WHATSAPP_TEMPLATE_DEFAULTS };
  if (!raw || typeof raw !== "object") return out;
  for (const key of Object.keys(WHATSAPP_TEMPLATE_DEFAULTS) as WhatsAppTemplateKey[]) {
    const v = (raw as Record<string, unknown>)[key];
    if (typeof v === "string" && v.trim()) out[key] = v.slice(0, MAX_TEMPLATE_LENGTH);
  }
  return out;
}

/** Replace {placeholders} that appear in `vars`; others are left as typed. */
export function fillWhatsAppTemplate(
  template: string,
  vars: Record<string, string | number | null | undefined>
): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    if (!(name in vars)) return match;
    const v = vars[name];
    return v == null || v === "" ? "" : String(v);
  });
}
