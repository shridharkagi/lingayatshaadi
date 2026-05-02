"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import type { MembershipPlan } from "@/types";

const CONFIG_KEY = "lingayat_bandhu_config";
const LEGACY_CONFIG_KEY = "lingayat_shaadi_config";

const ALL_PLAN_IDS = ["p0", "p1", "p2", "p3"];

export interface AppConfig {
  whatsappGroupUrl: string;
  whatsappContactNumber: string;
  callContactNumber: string;
  whatsappDefaultMessage: string;
  enabledPlanIds: string[];
  planOverrides: Record<string, Partial<MembershipPlan>>;
  /** Favicon URL - if set, overrides default favicon */
  faviconUrl: string;
  /** Injected into document head (e.g. gtag config, meta pixels) */
  externalScriptsHead: string;
  /** Injected at start of body (widgets, deferred loaders) */
  externalScriptsBody: string;
  /** @deprecated same as body scripts — kept for older cached localStorage */
  externalScripts: string;
  /** robots.txt content */
  robotsTxt: string;
  /** SEO meta description */
  seoDescription: string;
  /** SEO meta keywords */
  seoKeywords: string;
  /** Hero image URL for Brides listing page */
  bridesHeroImageUrl: string;
  /** Hero image URL for Grooms listing page */
  groomsHeroImageUrl: string;
}

const defaultConfig: AppConfig = {
  whatsappGroupUrl: "",
  whatsappContactNumber: "6360130905",
  callContactNumber: "6360130905",
  whatsappDefaultMessage: "I need assistance, my name: ",
  enabledPlanIds: ALL_PLAN_IDS,
  planOverrides: {},
  faviconUrl: "",
  externalScriptsHead: "",
  externalScriptsBody: "",
  externalScripts: "",
  robotsTxt: "User-agent: *\nAllow: /",
  seoDescription: "Premium matrimonial platform for the Lingayat community",
  seoKeywords: "Lingayat matrimony, LingayatBandhu, Lingayat marriage",
  bridesHeroImageUrl:
    "https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&q=75&fit=crop",
  groomsHeroImageUrl:
    "https://images.unsplash.com/photo-1606800052052-a08af7148866?w=1600&q=70&fit=crop",
};

const AppConfigContext = createContext<{
  config: AppConfig;
  updateConfig: (updates: Partial<AppConfig>) => void;
} | undefined>(undefined);

export function AppConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(defaultConfig);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(CONFIG_KEY) || localStorage.getItem(LEGACY_CONFIG_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setConfig((prev) => ({
          ...prev,
          ...parsed,
          enabledPlanIds: Array.isArray(parsed.enabledPlanIds) ? parsed.enabledPlanIds : ALL_PLAN_IDS,
          planOverrides: parsed.planOverrides && typeof parsed.planOverrides === "object" ? parsed.planOverrides : {},
          faviconUrl: typeof parsed.faviconUrl === "string" ? parsed.faviconUrl : "",
          externalScriptsHead:
            typeof parsed.externalScriptsHead === "string" ? parsed.externalScriptsHead : "",
          externalScriptsBody:
            typeof parsed.externalScriptsBody === "string"
              ? parsed.externalScriptsBody
              : typeof parsed.externalScripts === "string"
                ? parsed.externalScripts
                : "",
          externalScripts:
            typeof parsed.externalScriptsBody === "string"
              ? parsed.externalScriptsBody
              : typeof parsed.externalScripts === "string"
                ? parsed.externalScripts
                : "",
          robotsTxt: typeof parsed.robotsTxt === "string" ? parsed.robotsTxt : defaultConfig.robotsTxt,
          seoDescription: typeof parsed.seoDescription === "string" ? parsed.seoDescription : defaultConfig.seoDescription,
          seoKeywords: typeof parsed.seoKeywords === "string" ? parsed.seoKeywords : defaultConfig.seoKeywords,
          bridesHeroImageUrl:
            typeof parsed.bridesHeroImageUrl === "string"
              ? parsed.bridesHeroImageUrl
              : defaultConfig.bridesHeroImageUrl,
          groomsHeroImageUrl:
            typeof parsed.groomsHeroImageUrl === "string"
              ? parsed.groomsHeroImageUrl
              : defaultConfig.groomsHeroImageUrl,
        }));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public-config", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((serverConfig: Partial<AppConfig> | null) => {
        if (cancelled || !serverConfig) return;
        setConfig((prev) => {
          const next = { ...prev, ...serverConfig };
          try {
            localStorage.setItem(CONFIG_KEY, JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const updateConfig = (updates: Partial<AppConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  return (
    <AppConfigContext.Provider value={{ config, updateConfig }}>
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig() {
  const ctx = useContext(AppConfigContext);
  if (!ctx) return { config: defaultConfig, updateConfig: () => {} };
  return ctx;
}
