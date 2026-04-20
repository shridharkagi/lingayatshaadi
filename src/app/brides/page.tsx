"use client";

import { ProfilesView } from "@/components/ProfilesView";

export default function BridesPage() {
  return (
    <ProfilesView
      lockedGender="female"
      title="Brides"
      subtitle="Discover Lingayat brides looking for their life partner"
      itemNoun="brides"
      heroImage="https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=1600&q=70"
    />
  );
}
