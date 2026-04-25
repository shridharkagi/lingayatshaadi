"use client";

import { ProfilesProvider } from "@/contexts/ProfilesContext";

export default function GroomsBrowseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProfilesProvider>{children}</ProfilesProvider>;
}
