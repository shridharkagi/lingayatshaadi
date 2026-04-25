"use client";

import { ProfilesProvider } from "@/contexts/ProfilesContext";

/**
 * Member profile list state for superadmin user create/edit flows only.
 * Scoped here so the main superadmin dashboard does not load the public profile list.
 */
export default function SuperAdminUsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProfilesProvider>{children}</ProfilesProvider>;
}
