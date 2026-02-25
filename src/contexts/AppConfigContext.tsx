"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

const CONFIG_KEY = "lingayat_shaadi_config";

interface AppConfig {
  whatsappGroupUrl: string;
  whatsappContactNumber: string;
  callContactNumber: string;
}

const defaultConfig: AppConfig = {
  whatsappGroupUrl: "",
  whatsappContactNumber: "",
  callContactNumber: "",
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
      const stored = localStorage.getItem(CONFIG_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setConfig((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore
    }
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
