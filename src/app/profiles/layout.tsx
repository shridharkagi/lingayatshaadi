"use client";

import { ProfilesProvider } from "@/contexts/ProfilesContext";

export default function ProfilesBrowseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProfilesProvider>{children}</ProfilesProvider>;
}
