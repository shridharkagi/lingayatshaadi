"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, MessageSquare, CreditCard, Bell, Shield, BarChart3, Settings } from "lucide-react";

const navItems = [
  { href: "/superadmin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/superadmin/users", icon: Users, label: "Users" },
  { href: "/superadmin/messages", icon: MessageSquare, label: "Messages" },
  { href: "/superadmin/subscriptions", icon: CreditCard, label: "Subscriptions" },
  { href: "/superadmin/notifications", icon: Bell, label: "Notifications" },
  { href: "/superadmin/verifications", icon: Shield, label: "Verifications" },
  { href: "/superadmin/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/superadmin/settings", icon: Settings, label: "Settings" },
];

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <aside className="w-64 bg-[var(--primary)] text-white min-h-screen fixed left-0 top-0">
        <div className="p-6 border-b border-white/20">
          <Link href="/superadmin" className="text-xl font-bold">LingayatShaadi</Link>
          <p className="text-white/70 text-sm mt-1">Super Admin</p>
        </div>
        <nav className="p-4 space-y-1">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href || (href !== "/superadmin" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  isActive ? "bg-white/20" : "hover:bg-white/10"
                }`}
              >
                <Icon size={20} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-4 left-4 right-4">
          <Link href="/home" className="block text-center py-2 text-white/80 hover:text-white text-sm">
            ← Back to App
          </Link>
        </div>
      </aside>
      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
    </div>
  );
}
