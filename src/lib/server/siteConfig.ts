import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { createSupabaseAdminSafe } from "@/lib/supabase";

const CONFIG_PATH = join(process.cwd(), "data", "site-config.json");
const SITE_SETTINGS_ROW_ID = "default";

export type SiteConfig = {
  robotsTxt: string;
  seoDescription: string;
  seoKeywords: string;
  whatsappGroupUrl: string;
  whatsappContactNumber: string;
  callContactNumber: string;
  whatsappDefaultMessage: string;
  faviconUrl: string;
  /** @deprecated use externalScriptsBody — kept for migration / JSON compatibility */
  externalScripts: string;
  externalScriptsHead: string;
  externalScriptsBody: string;
  bridesHeroImageUrl: string;
  groomsHeroImageUrl: string;
};

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  robotsTxt: "User-agent: *\nAllow: /",
  seoDescription: "",
  seoKeywords: "",
  whatsappGroupUrl: "",
  whatsappContactNumber: "6360130905",
  callContactNumber: "6360130905",
  whatsappDefaultMessage: "I need assistance, my name: ",
  faviconUrl: "",
  externalScripts: "",
  externalScriptsHead: "",
  externalScriptsBody: "",
  bridesHeroImageUrl:
    "https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&q=75&fit=crop",
  groomsHeroImageUrl:
    "https://images.unsplash.com/photo-1606800052052-a08af7148866?w=1600&q=70&fit=crop",
};

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

export function normalizeSiteConfig(raw: Record<string, unknown> | null | undefined): SiteConfig {
  const merged: SiteConfig = { ...DEFAULT_SITE_CONFIG, ...(raw || {}) } as SiteConfig;
  if (!merged.externalScriptsBody?.trim() && merged.externalScripts?.trim()) {
    merged.externalScriptsBody = merged.externalScripts;
  }
  return merged;
}

export function readSiteConfigFromFile(): SiteConfig {
  try {
    if (existsSync(CONFIG_PATH)) {
      const parsed = asRecord(JSON.parse(readFileSync(CONFIG_PATH, "utf-8")));
      if (parsed) return normalizeSiteConfig(parsed);
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_SITE_CONFIG };
}

export async function readSiteConfig(): Promise<SiteConfig> {
  const admin = createSupabaseAdminSafe();
  if (admin) {
    const { data, error } = await admin
      .from("site_settings")
      .select("config")
      .eq("id", SITE_SETTINGS_ROW_ID)
      .maybeSingle();
    if (!error && data?.config) {
      const parsed = asRecord(data.config);
      if (parsed) return normalizeSiteConfig(parsed);
    }
  }
  return readSiteConfigFromFile();
}

export async function mergeAndPersistSiteConfig(partial: Partial<SiteConfig>): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const current = await readSiteConfig();
  const updated = normalizeSiteConfig({ ...current, ...partial } as Record<string, unknown>);

  const admin = createSupabaseAdminSafe();
  if (admin) {
    const { error } = await admin.from("site_settings").upsert(
      {
        id: SITE_SETTINGS_ROW_ID,
        config: updated,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (error) {
      return { ok: false, error: `Could not save to database: ${error.message}` };
    }
    return { ok: true };
  }

  try {
    const dir = join(process.cwd(), "data");
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2), "utf-8");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const readOnlyError = /EROFS|EACCES|read-only|EPERM/i.test(msg);
    const hint =
      readOnlyError || process.env.VERCEL === "1"
        ? " If this is serverless, use Supabase: set SUPABASE_SERVICE_ROLE_KEY and run supabase-site-settings.sql in the Supabase SQL editor."
        : "";
    return { ok: false, error: `Failed to save site configuration.${hint} (${msg})` };
  }
}
