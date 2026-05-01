"use client";

import { ProfilesProvider } from "@/contexts/ProfilesContext";

export function ProfilesClientProvider({ children }: { children: React.ReactNode }) {
  return <ProfilesProvider>{children}</ProfilesProvider>;
}
