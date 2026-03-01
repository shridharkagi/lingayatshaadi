"use client";

import { useEffect } from "react";
import { useAppConfig } from "@/contexts/AppConfigContext";

/**
 * Injects favicon and external scripts from app config into the document head.
 */
export function ConfigInjector() {
  const { config } = useAppConfig();

  useEffect(() => {
    if (typeof document === "undefined") return;

    // Favicon
    if (config.faviconUrl) {
      let link = document.querySelector<HTMLLinkElement>("link[rel='icon'][data-dynamic='true']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        link.setAttribute("data-dynamic", "true");
        document.head.appendChild(link);
      }
      link.href = config.faviconUrl;
      link.type = "image/x-icon";
    } else {
      const link = document.querySelector<HTMLLinkElement>("link[rel='icon'][data-dynamic='true']");
      if (link) link.remove();
    }
  }, [config.faviconUrl]);

  useEffect(() => {
    if (typeof document === "undefined" || !config.externalScripts?.trim()) return;

    const container = document.getElementById("lingayat-external-scripts");
    if (!container) return;

    // Clear previous scripts
    container.querySelectorAll("[data-lingayat-injected]").forEach((el) => el.remove());

    // Parse and inject scripts - support both full script tags and URLs
    const html = config.externalScripts.trim();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const scripts = doc.querySelectorAll("script");

    scripts.forEach((oldScript) => {
      const newScript = document.createElement("script");
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });
      if (oldScript.src) {
        newScript.src = oldScript.src;
      }
      if (oldScript.textContent) {
        newScript.textContent = oldScript.textContent;
      }
      newScript.setAttribute("data-lingayat-injected", "true");
      container.appendChild(newScript);
    });

    // If no script tags, treat as URLs (one per line) or single URL
    if (scripts.length === 0 && !html.startsWith("<")) {
      const lines = html.split("\n").map((l) => l.trim()).filter(Boolean);
      for (const url of lines) {
        if (url.startsWith("http://") || url.startsWith("https://")) {
          const script = document.createElement("script");
          script.src = url;
          script.setAttribute("data-lingayat-injected", "true");
          container.appendChild(script);
        }
      }
    }

    return () => {
      container.querySelectorAll("[data-lingayat-injected]").forEach((el) => el.remove());
    };
  }, [config.externalScripts]);

  return null;
}
