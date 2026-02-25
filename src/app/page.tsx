"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

// Root is redirected to /onboarding by middleware. This page is a fallback.
export default function RootPage() {
  const router = useRouter();
  const { isLoggedIn, profileComplete, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    const hasVisited = sessionStorage.getItem("lingayat_visited");
    if (!hasVisited) {
      router.replace("/onboarding");
      return;
    }
    if (!isLoggedIn) {
      router.replace("/login");
    } else if (!profileComplete) {
      router.replace("/profile/complete");
    } else {
      router.replace("/home");
    }
  }, [router, isLoggedIn, profileComplete, loading]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--primary)]">
      <div className="animate-pulse text-white text-2xl font-semibold">
        LingayatShaadi
      </div>
    </div>
  );
}
