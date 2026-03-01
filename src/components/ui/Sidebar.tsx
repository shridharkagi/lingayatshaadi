"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Home, Search, MessageCircle, User, Bell, Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { mockNotifications } from "@/data/mock";
import { getMemberIdDisplay } from "@/lib/memberId";

const navItems = [
  { href: "/home", icon: Home, label: "Home" },
  { href: "/search", icon: Search, label: "Search" },
  { href: "/messages", icon: MessageCircle, label: "Messages" },
  { href: "/activities", icon: Bell, label: "Activities" },
  { href: "/profile", icon: User, label: "Profile" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const unreadCount = mockNotifications.filter((n) => !n.read).length;

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-[var(--border)] min-h-screen fixed left-0 top-0 z-40">
      <Link href="/home" className="p-6 flex items-center gap-2 border-b border-[var(--border)]">
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
          href="/profile"
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100"
        >
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
            {user?.profilePhoto ? (
              <Image src={user.profilePhoto} alt={`Profile photo of ${user?.fullName || "user"}`} width={40} height={40} className="object-cover" unoptimized />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[var(--primary)] font-semibold">
                {user?.fullName?.[0] || "?"}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{user?.fullName || "Profile"}</p>
            <p className="text-xs text-gray-500 truncate">{user ? getMemberIdDisplay(user) : ""}</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
