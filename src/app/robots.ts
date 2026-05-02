import { MetadataRoute } from "next";
import { readSiteConfig } from "@/lib/server/siteConfig";

export default async function robots(): Promise<MetadataRoute.Robots> {
  try {
    const data = await readSiteConfig();
    const content = (data.robotsTxt || "User-agent: *\nAllow: /").trim();
    const lines = content.split("\n");
    const rules: Record<string, { allow?: string[]; disallow?: string[] }> = {};
    let currentAgent = "*";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const colonIdx = trimmed.indexOf(":");
      const key = colonIdx >= 0 ? trimmed.slice(0, colonIdx).trim().toLowerCase() : "";
      const value = colonIdx >= 0 ? trimmed.slice(colonIdx + 1).trim() : "";

      if (key === "user-agent") {
        currentAgent = value || "*";
        if (!rules[currentAgent]) rules[currentAgent] = {};
      } else if (key === "allow" && rules[currentAgent]) {
        rules[currentAgent].allow = rules[currentAgent].allow || [];
        rules[currentAgent].allow!.push(value);
      } else if (key === "disallow" && rules[currentAgent]) {
        rules[currentAgent].disallow = rules[currentAgent].disallow || [];
        rules[currentAgent].disallow!.push(value);
      }
    }

    const rulesArray = Object.entries(rules).map(([ua, r]) => ({
      userAgent: ua,
      allow: r.allow?.length ? r.allow : undefined,
      disallow: r.disallow?.length ? r.disallow : undefined,
    }));
    if (rulesArray.length > 0) {
      return { rules: rulesArray };
    }
  } catch {
    // fallback
  }
  return { rules: [{ userAgent: "*", allow: "/" }] };
}
