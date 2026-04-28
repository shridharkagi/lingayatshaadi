"use client";

import { ProfilesView } from "@/components/ProfilesView";
import { useAppConfig } from "@/contexts/AppConfigContext";

const DEFAULT_GROOMS_HERO =
  "https://images.unsplash.com/photo-1606800052052-a08af7148866?w=1600&q=70&fit=crop";

export default function GroomsPage() {
  const { config } = useAppConfig();
  return (
    <ProfilesView
      lockedGender="male"
      title="Grooms"
      subtitle="Discover Lingayat grooms looking for their life partner"
      itemNoun="grooms"
      heroImage={config.groomsHeroImageUrl?.trim() || DEFAULT_GROOMS_HERO}
    />
  );
}
