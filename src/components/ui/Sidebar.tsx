"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ComponentType, SVGProps } from "react";
import { Search, MessageCircle, User, Bell, Heart, Users2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { FEATURE_MESSAGING_ENABLED } from "@/lib/featureFlags";
import { BrideIcon, GroomIcon } from "@/components/ui/icons/BrideGroomIcons";
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

export function Sidebar() {
  const pathname = usePathname();
  const { accountMeta, isLoggedIn, user, authUser } = useAuth();
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
    <aside className="hidden lg:flex flex-col w-64 bg-[#0D0C14] border-r border-[var(--lb-line)] min-h-screen fixed left-0 top-0 z-40">
      <Link href="/profiles" className="p-6 flex items-center gap-2 border-b border-[var(--border)]">
        <Heart className="w-8 h-8 text-[var(--lb-accent)] fill-[var(--lb-accent)]" />
        <span className="leading-tight text-[var(--primary)]">
          <span className="block text-xl font-bold lb-wordmark">LingayatBandhu</span>
          <span className="block text-[11px] font-semibold tracking-[0.14em] uppercase text-[var(--lb-subtle)]">
            Matrimony
          </span>
        </span>
      </Link>
      <nav className="flex-1 p-4 space-y-1">
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
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-[var(--lb-muted)] hover:bg-white/5"
              >
                <div className="relative">
                  <Icon size={22} />
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[image:var(--lb-accent-grad)] text-[var(--lb-on-accent)] text-[10px] font-bold flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
                <span className="font-medium">{label}</span>
              </button>
            );
          }

          return (
            <Link
              key={href}
              href={resolvedHref}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                isActive ? "bg-[var(--lb-accent-tint)] text-[var(--lb-accent-text)] font-semibold" : "text-[var(--lb-muted)] hover:bg-white/5"
              }`}
            >
              <div className="relative">
                <Icon size={22} />
                {showBadge && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[image:var(--lb-accent-grad)] text-[var(--lb-on-accent)] text-[10px] font-bold flex items-center justify-center">
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
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5"
        >
          <div className="w-10 h-10 rounded-full overflow-hidden bg-[var(--lb-accent-tint)] flex items-center justify-center text-[var(--lb-accent-text)] font-semibold">
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
