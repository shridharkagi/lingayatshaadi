"use client";

import { ProfilesProvider } from "@/contexts/ProfilesContext";

export default function BridesBrowseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProfilesProvider>{children}</ProfilesProvider>;
}
