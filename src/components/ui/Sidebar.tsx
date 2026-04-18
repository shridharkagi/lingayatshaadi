"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, MessageCircle, User, Bell, Heart, Users2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { mockNotifications } from "@/data/mock";

const navItems = [
  { href: "/profiles", icon: Users2, label: "Profiles" },
  { href: "/search", icon: Search, label: "Search" },
  { href: "/messages", icon: MessageCircle, label: "Messages" },
  { href: "/activities", icon: Bell, label: "Activities" },
  { href: "/account", icon: User, label: "Account" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { accountMeta } = useAuth();
  const unreadCount = mockNotifications.filter((n) => !n.read).length;

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-[var(--border)] min-h-screen fixed left-0 top-0 z-40">
      <Link href="/profiles" className="p-6 flex items-center gap-2 border-b border-[var(--border)]">
        <Heart className="w-8 h-8 text-[var(--primary)] fill-[var(--primary)]" />
        <span className="text-xl font-bold text-[var(--primary)]">LingayatShaadi</span>
      </Link>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          const showBadge = href === "/activities" && unreadCount > 0;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                isActive ? "bg-[var(--primary)] text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <div className="relative">
                <Icon size={22} />
                {showBadge && (
                  <span className="absolute -top-1 -right-1 bg-[var(--accent)] text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <span className="font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-[var(--border)]">
        <Link
          href="/account"
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100"
        >
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center text-[var(--primary)] font-semibold">
            {accountMeta?.firstName?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{accountMeta?.fullName || "Account"}</p>
            <p className="text-xs text-gray-500 truncate">{accountMeta?.city || ""}</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
