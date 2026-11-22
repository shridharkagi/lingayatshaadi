"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  const mediaQueryStandalone = window.matchMedia?.("(display-mode: standalone)")?.matches;
  const navigatorStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return Boolean(mediaQueryStandalone || navigatorStandalone);
}

export function InstallPWAButton() {
  const pathname = usePathname() ?? "";
  const isAdminRoute = pathname === "/superadmin" || pathname.startsWith("/superadmin/");
  // Not on the profile wizard / individual profile pages (covers their action
  // bars) or the account page.
  const isHiddenRoute =
    pathname === "/account" || pathname.startsWith("/profile/") || pathname.startsWith("/p/");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    setIsInstalled(isStandaloneMode());

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (!isStandaloneMode()) {
        setDeferredPrompt(event as BeforeInstallPromptEvent);
      }
    };

    const onAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  // Not offered inside the admin console (and its styles are Midnight-only).
  if (isAdminRoute || isHiddenRoute || isInstalled || !deferredPrompt) return null;

  return (
    <button
      type="button"
      onClick={handleInstall}
      className="inline-flex items-center justify-center lb-btn-primary fixed bottom-24 left-4 z-50 rounded-xl px-4 h-11 text-sm font-semibold sm:bottom-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lb-accent)]"
      aria-label="Install LingayatBandhu app"
    >
      Install App
    </button>
  );
}
