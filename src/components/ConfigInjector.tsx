"use client";

import { useEffect } from "react";
import { useAppConfig } from "@/contexts/AppConfigContext";

function injectScriptsIntoParent(html: string, parent: ParentNode, slot: "head" | "body") {
  const marker = slot;
  parent.querySelectorAll(`script[data-lingayat-injected="${marker}"]`).forEach((el) => el.remove());
  const trimmed = html.trim();
  if (!trimmed) return;

  const parser = new DOMParser();
  const doc = parser.parseFromString(trimmed, "text/html");
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
    newScript.setAttribute("data-lingayat-injected", marker);
    parent.appendChild(newScript);
  });

  if (scripts.length === 0 && !trimmed.startsWith("<")) {
    const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
    for (const url of lines) {
      if (url.startsWith("http://") || url.startsWith("https://")) {
        const script = document.createElement("script");
        script.src = url;
        script.setAttribute("data-lingayat-injected", marker);
        parent.appendChild(script);
      }
    }
  }
}

/**
 * Injects favicon and external scripts from app config (head vs body).
 */
export function ConfigInjector() {
  const { config } = useAppConfig();

  useEffect(() => {
    if (typeof document === "undefined") return;

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
    if (typeof document === "undefined") return;
    const html = config.externalScriptsHead?.trim();
    if (!html) {
      document.head.querySelectorAll(`script[data-lingayat-injected="head"]`).forEach((el) => el.remove());
      return;
    }
    injectScriptsIntoParent(html, document.head, "head");
    return () => {
      document.head.querySelectorAll(`script[data-lingayat-injected="head"]`).forEach((el) => el.remove());
    };
  }, [config.externalScriptsHead]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const bodyHtml =
      config.externalScriptsBody?.trim() || config.externalScripts?.trim();
    const container = document.getElementById("lingayat-external-scripts");
    if (!container) return;

    container.querySelectorAll(`script[data-lingayat-injected="body"]`).forEach((el) => el.remove());
    if (!bodyHtml) return;

    injectScriptsIntoParent(bodyHtml, container, "body");
    return () => {
      container.querySelectorAll(`script[data-lingayat-injected="body"]`).forEach((el) => el.remove());
    };
  }, [config.externalScriptsBody, config.externalScripts]);

  return null;
}
