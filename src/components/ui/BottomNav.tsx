"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ComponentType, SVGProps } from "react";
import { Search, MessageCircle, User, Bell, Users2 } from "lucide-react";
import { FEATURE_MESSAGING_ENABLED } from "@/lib/featureFlags";
import { BrideIcon, GroomIcon } from "@/components/ui/icons/BrideGroomIcons";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { getUnreadNotificationCount } from "@/lib/api/notifications";

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
  const { isLoggedIn, user, authUser } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isLoggedIn) {
      setUnreadCount(0);
      return;
    }
    const ids = Array.from(new Set([user?.id, authUser?.id].filter(Boolean) as string[]));
    getUnreadNotificationCount(ids).then(({ count }) => setUnreadCount(count || 0));
  }, [isLoggedIn, user?.id, authUser?.id]);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--border)] z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isProtected = href === "/activities" || href === "/account";
          const resolvedHref = href === "/activities" && isLoggedIn ? "/notifications" : href;
          const isActive =
            pathname === resolvedHref ||
            pathname.startsWith(resolvedHref + "/") ||
            (href === "/activities" && pathname.startsWith("/activities"));
          const showBadge = (href === "/activities" || resolvedHref === "/notifications") && unreadCount > 0;

          if (!isLoggedIn && isProtected) {
            return (
              <button
                key={href}
                type="button"
                onClick={() => openAuthModal("login")}
                className="flex flex-col items-center justify-center flex-1 py-2 px-1 transition-colors min-w-0 text-gray-500"
              >
                <div className="relative">
                  <Icon size={22} strokeWidth={2} />
                  {showBadge && (
                    <span className="absolute -top-1 -right-2 bg-[var(--accent)] text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-0.5 truncate w-full text-center">{label}</span>
              </button>
            );
          }

          return (
            <Link
              key={href}
              href={resolvedHref}
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
