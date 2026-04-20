"use client";

import { ProfilesView } from "@/components/ProfilesView";

export default function GroomsPage() {
  return (
    <ProfilesView
      lockedGender="male"
      title="Grooms"
      subtitle="Discover Lingayat grooms looking for their life partner"
      itemNoun="grooms"
      heroImage="https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=1600&q=70"
    />
  );
}
