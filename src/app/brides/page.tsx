"use client";

import { ProfilesView } from "@/components/ProfilesView";
import { useAppConfig } from "@/contexts/AppConfigContext";

const DEFAULT_BRIDES_HERO =
  "https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&q=75&fit=crop";

export default function BridesPage() {
  const { config } = useAppConfig();
  return (
    <ProfilesView
      lockedGender="female"
      title="Brides"
      subtitle="Discover Lingayat brides looking for their life partner"
      itemNoun="brides"
      heroImage={config.bridesHeroImageUrl?.trim() || DEFAULT_BRIDES_HERO}
    />
  );
}
