"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { Search, MessageCircle, User, Bell, Users2 } from "lucide-react";
import { mockNotifications } from "@/data/mock";
import { FEATURE_MESSAGING_ENABLED } from "@/lib/featureFlags";
import { BrideIcon, GroomIcon } from "@/components/ui/icons/BrideGroomIcons";

type NavIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number }>;

type NavItem = {
  href: string;
  icon: NavIcon;
  label: string;
};

const baseNavItems: NavItem[] = [
  { href: "/profiles", icon: Users2 as NavIcon, label: "Profiles" },
  { href: "/search", icon: Search as NavIcon, label: "Search" },
];

const messagingItem: NavItem = { href: "/messages", icon: MessageCircle as NavIcon, label: "Messages" };

const brideGroomItems: NavItem[] = [
  { href: "/brides", icon: BrideIcon, label: "Brides" },
  { href: "/grooms", icon: GroomIcon, label: "Grooms" },
];

const tailItems: NavItem[] = [
  { href: "/activities", icon: Bell as NavIcon, label: "Activities" },
  { href: "/account", icon: User as NavIcon, label: "Account" },
];

const navItems: NavItem[] = [
  ...baseNavItems,
  ...(FEATURE_MESSAGING_ENABLED ? [messagingItem] : brideGroomItems),
  ...tailItems,
];

export function BottomNav() {
  const pathname = usePathname();
  const unreadCount = mockNotifications.filter((n) => !n.read).length;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--border)] z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          const showBadge = href === "/activities" && unreadCount > 0;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center flex-1 py-2 px-1 transition-colors min-w-0 ${
                isActive ? "text-[var(--primary)]" : "text-gray-500"
              }`}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                {showBadge && (
                  <span className="absolute -top-1 -right-2 bg-[var(--accent)] text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 truncate w-full text-center">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
