"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, User, Bell, CreditCard, HelpCircle, LogOut, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function SettingsPage() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const isSuperAdmin = user?.role === "superadmin";

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="max-w-lg mx-auto pb-6">
      <header className="bg-white border-b border-[var(--border)] px-4 py-4">
        <h1 className="text-xl font-bold text-[var(--foreground)]">Settings</h1>
      </header>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <Link href="/profile" className="flex items-center gap-3 p-4 border-b border-[var(--border)]">
            <User size={20} className="text-gray-500" />
            <span className="flex-1 font-medium">View my profile</span>
            <ChevronRight size={20} className="text-gray-400" />
          </Link>
          <Link href="/account" className="flex items-center gap-3 p-4 border-b border-[var(--border)]">
            <User size={20} className="text-gray-500" />
            <span className="flex-1 font-medium">Account Settings</span>
            <ChevronRight size={20} className="text-gray-400" />
          </Link>
          <Link href="/settings/notifications" className="flex items-center gap-3 p-4 border-b border-[var(--border)]">
            <Bell size={20} className="text-gray-500" />
            <span className="flex-1 font-medium">Notification Settings</span>
            <ChevronRight size={20} className="text-gray-400" />
          </Link>
          <Link href="/membership" className="flex items-center gap-3 p-4 border-b border-[var(--border)]">
            <CreditCard size={20} className="text-gray-500" />
            <span className="flex-1 font-medium">Billing & Membership</span>
            <ChevronRight size={20} className="text-gray-400" />
          </Link>
          <Link href="/settings/help" className="flex items-center gap-3 p-4 border-b border-[var(--border)]">
            <HelpCircle size={20} className="text-gray-500" />
            <span className="flex-1 font-medium">Help & Support</span>
            <ChevronRight size={20} className="text-gray-400" />
          </Link>
          {isSuperAdmin && (
            <Link href="/superadmin" className="flex items-center gap-3 p-4">
              <LayoutDashboard size={20} className="text-gray-500" />
              <span className="flex-1 font-medium">Super Admin</span>
              <ChevronRight size={20} className="text-gray-400" />
            </Link>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm text-red-600 font-medium"
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </div>
  );
}
