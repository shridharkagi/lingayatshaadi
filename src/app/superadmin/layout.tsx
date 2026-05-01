"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  CreditCard,
  Bell,
  Shield,
  BarChart3,
  Settings,
  ClipboardCheck,
  Trash2,
  History,
  ListChecks,
  PanelLeftClose,
  PanelLeftOpen,
  UserRoundX,
} from "lucide-react";

const navItems = [
  { href: "/superadmin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/superadmin/users", icon: Users, label: "Users" },
  { href: "/superadmin/moderation", icon: ClipboardCheck, label: "Moderation" },
  { href: "/superadmin/deletion-requests", icon: UserRoundX, label: "Deletion requests" },
  { href: "/superadmin/messages", icon: MessageSquare, label: "Messages" },
  { href: "/superadmin/subscriptions", icon: CreditCard, label: "Subscriptions" },
  { href: "/superadmin/notifications", icon: Bell, label: "Notifications" },
  { href: "/superadmin/review-center", icon: ListChecks, label: "Review Center" },
  { href: "/superadmin/verifications", icon: Shield, label: "Verifications" },
  { href: "/superadmin/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/superadmin/trash", icon: Trash2, label: "Trash" },
  { href: "/superadmin/admin-logs", icon: History, label: "Admin Logs" },
  { href: "/superadmin/settings", icon: Settings, label: "Settings" },
];

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className={`${collapsed ? "w-20" : "w-64"} bg-[var(--primary)] text-white min-h-screen fixed left-0 top-0 transition-all duration-200`}>
        <div className={`p-4 ${collapsed ? "px-3" : "px-6"} border-b border-white/20`}>
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div>
                <Link href="/superadmin" className="text-xl font-bold">LingayatBandhu</Link>
                <p className="text-white/70 text-sm mt-1">Super Admin</p>
              </div>
            )}
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="rounded-md p-2 hover:bg-white/10"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>
        </div>
        <nav className="p-4 space-y-1">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href || (href !== "/superadmin" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center ${collapsed ? "justify-center" : "gap-3"} px-4 py-3 rounded-lg transition ${
                  isActive ? "bg-white/20" : "hover:bg-white/10"
                }`}
                title={label}
              >
                <Icon size={20} />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-4 left-4 right-4">
          <Link href="/home" className="block text-center py-2 text-white/80 hover:text-white text-sm">
            {collapsed ? "←" : "← Back to App"}
          </Link>
        </div>
      </aside>
      <main className={`flex-1 ${collapsed ? "ml-20" : "ml-64"} p-6 transition-all duration-200`}>
        <div className="mb-4 flex justify-end">
          <Link
            href="/superadmin/users/create"
            className="inline-flex items-center rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
          >
            Create Profile
          </Link>
        </div>
        {children}
      </main>
    </div>
  );
}
