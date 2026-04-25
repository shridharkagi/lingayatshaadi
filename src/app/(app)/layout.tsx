"use client";

import { BottomNav } from "@/components/ui/BottomNav";
import { Sidebar } from "@/components/ui/Sidebar";
import { ProfilesProvider } from "@/contexts/ProfilesContext";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProfilesProvider>
      <div className="min-h-screen bg-[var(--background)]">
        <Sidebar />
        <main className="lg:pl-64 pb-20 lg:pb-8">
          <div className="max-w-6xl mx-auto px-4 lg:px-8">
            {children}
          </div>
        </main>
        <BottomNav />
      </div>
    </ProfilesProvider>
  );
}
