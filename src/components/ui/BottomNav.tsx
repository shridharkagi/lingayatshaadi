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
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--lb-line)] bg-[#0D0C14]/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]" aria-label="Main">
      <div className="flex justify-around items-center h-[66px] max-w-lg mx-auto px-1">
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
                className="flex flex-col items-center justify-center flex-1 py-1.5 px-1 transition-colors min-w-0 text-[var(--lb-subtle)] active:scale-95"
              >
                <div className="relative flex h-[30px] w-[50px] items-center justify-center rounded-full">
                  <Icon size={21} strokeWidth={1.9} />
                  {showBadge && (
                    <span className="absolute -top-0.5 right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-[image:var(--lb-accent-grad)] text-[var(--lb-on-accent)] text-[10px] font-bold flex items-center justify-center ring-2 ring-[#0D0C14]">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
                <span className="text-[10.5px] mt-0.5 truncate w-full text-center">{label}</span>
              </button>
            );
          }

          return (
            <Link
              key={href}
              href={resolvedHref}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 transition-colors min-w-0 active:scale-95 ${
                isActive ? "text-[var(--lb-accent-text)] font-semibold" : "text-[var(--lb-subtle)]"
              }`}
            >
              <div
                className={`relative flex h-[30px] w-[50px] items-center justify-center rounded-full transition-colors duration-200 ${
                  isActive ? "bg-[var(--lb-accent-tint)]" : ""
                }`}
              >
                <Icon size={21} strokeWidth={isActive ? 2.2 : 1.9} />
                {showBadge && (
                  <span className="absolute -top-0.5 right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-[image:var(--lb-accent-grad)] text-[var(--lb-on-accent)] text-[10px] font-bold flex items-center justify-center ring-2 ring-[#0D0C14]">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10.5px] mt-0.5 truncate w-full text-center">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
