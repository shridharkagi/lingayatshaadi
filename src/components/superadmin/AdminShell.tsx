"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  Bell,
  ClipboardCheck,
  CreditCard,
  Eye,
  History,
  LayoutDashboard,
  LogIn,
  Menu,
  Plus,
  Settings,
  ShieldCheck,
  Trash2,
  UserRound,
  UserRoundX,
  UsersRound,
  ArrowLeft,
  Handshake,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";
import { adminFetch } from "@/lib/api/adminClient";
import GlobalSearch from "./GlobalSearch";

type Inbox = {
  pendingProfiles?: number;
  pendingPhotos?: number;
  pendingKyc?: number;
  upgradeOpen?: number;
  deletionRequests?: number;
};

type NavItem = { href: string; label: string; icon: LucideIcon; badge?: (i: Inbox) => number; exact?: boolean };
type NavGroup = { title?: string; items: NavItem[] };

const NAV: NavGroup[] = [
  { items: [{ href: "/superadmin", label: "Overview", icon: LayoutDashboard, exact: true }] },
  {
    title: "Work",
    items: [
      {
        href: "/superadmin/moderation",
        label: "Review queue",
        icon: ClipboardCheck,
        badge: (i) => (i.pendingProfiles || 0) + (i.pendingPhotos || 0),
      },
      { href: "/superadmin/verifications", label: "KYC & verification", icon: ShieldCheck, badge: (i) => i.pendingKyc || 0 },
      { href: "/superadmin/deletion-requests", label: "Deletion requests", icon: UserRoundX, badge: (i) => i.deletionRequests || 0 },
    ],
  },
  {
    title: "Members",
    items: [
      { href: "/superadmin/users", label: "Accounts", icon: UsersRound },
      { href: "/superadmin/review-center", label: "Profiles", icon: UserRound },
    ],
  },
  {
    title: "Revenue",
    items: [
      { href: "/superadmin/pipeline", label: "Upgrade pipeline", icon: Handshake, badge: (i) => i.upgradeOpen || 0 },
      { href: "/superadmin/subscriptions", label: "Subscriptions & plans", icon: CreditCard },
    ],
  },
  {
    title: "Insights",
    items: [
      { href: "/superadmin/analytics", label: "Reports", icon: BarChart3 },
      { href: "/superadmin/leads", label: "WhatsApp leads", icon: MessageCircle },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/superadmin/notifications", label: "Notifications", icon: Bell },
      { href: "/superadmin/settings", label: "Site settings", icon: Settings },
      { href: "/superadmin/data-visibility", label: "Data visibility", icon: Eye },
      { href: "/superadmin/admin-logs", label: "Audit log", icon: History },
      { href: "/superadmin/trash", label: "Trash", icon: Trash2 },
    ],
  },
];

type Gate = "checking" | "ok" | "signin" | "denied";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [gate, setGate] = useState<Gate>("checking");
  const [menuOpen, setMenuOpen] = useState(false);
  const [inbox, setInbox] = useState<Inbox>({});

  useEffect(() => {
    let alive = true;
    adminFetch("/api/superadmin/me")
      .then((res) => {
        if (!alive) return;
        setGate(res.ok ? "ok" : res.status === 401 ? "signin" : "denied");
      })
      .catch(() => alive && setGate("denied"));
    return () => {
      alive = false;
    };
  }, []);

  const loadInbox = useCallback(() => {
    adminFetch("/api/superadmin/overview?range=7d")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j?.inbox && setInbox(j.inbox))
      .catch(() => undefined);
  }, []);

  // Refresh badge counts when the admin navigates (e.g. after approving).
  useEffect(() => {
    if (gate === "ok") loadInbox();
    setMenuOpen(false);
  }, [gate, pathname, loadInbox]);

  if (gate !== "ok") {
    return (
      <div className="ad-root">
        <div className="ad-gate">
          <div className="ad-card" style={{ maxWidth: 420, textAlign: "center", padding: 28 }}>
            <div className="ad-mark" style={{ margin: "0 auto 14px" }}>LB</div>
            {gate === "checking" && <p className="ad-muted">Checking admin access…</p>}
            {gate === "signin" && (
              <>
                <h1 className="ad-h2" style={{ fontSize: 18 }}>Sign in to the admin console</h1>
                <p className="ad-muted" style={{ margin: "8px 0 16px" }}>Log in with the super admin mobile number.</p>
                <button type="button" className="ad-btn pri" onClick={() => router.push("/login")}>
                  <LogIn size={16} /> Go to login
                </button>
              </>
            )}
            {gate === "denied" && (
              <>
                <h1 className="ad-h2" style={{ fontSize: 18 }}>No admin access</h1>
                <p className="ad-muted" style={{ margin: "8px 0 16px" }}>This account isn&apos;t a super admin.</p>
                <Link className="ad-btn ghost" href="/home">Back to the app</Link>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");

  return (
    <div className="ad-root">
      <div className={`ad-scrim ${menuOpen ? "open" : ""}`} onClick={() => setMenuOpen(false)} aria-hidden="true" />
      <aside className={`ad-side ${menuOpen ? "open" : ""}`} aria-label="Admin navigation">
        <Link href="/superadmin" className="ad-brand">
          <span className="ad-mark">LB</span>
          <span>
            <span style={{ display: "block", fontWeight: 800, fontSize: 16 }}>LingayatBandhu</span>
            <span style={{ display: "block", fontSize: 12, color: "#a39dc0" }}>Admin console</span>
          </span>
        </Link>
        {NAV.map((group, gi) => (
          <div key={gi}>
            {group.title && <div className="ad-grp">{group.title}</div>}
            {group.items.map((item) => {
              const Icon = item.icon;
              const count = item.badge ? item.badge(inbox) : 0;
              return (
                <Link key={item.href} href={item.href} className={`ad-nav ${isActive(item) ? "on" : ""}`}>
                  <Icon size={18} aria-hidden="true" />
                  <span>{item.label}</span>
                  {count > 0 && <span className="ad-badge">{count > 99 ? "99+" : count}</span>}
                </Link>
              );
            })}
          </div>
        ))}
        <div style={{ marginTop: "auto", paddingTop: 16 }}>
          <Link href="/home" className="ad-nav">
            <ArrowLeft size={18} aria-hidden="true" />
            <span>Back to the app</span>
          </Link>
        </div>
      </aside>

      <main className="ad-main">
        <div className="ad-top">
          <button
            type="button"
            className="ad-btn ghost ad-burger"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
            style={{ width: 44, padding: 0 }}
          >
            <Menu size={18} />
          </button>
          <GlobalSearch />
          <Link href="/superadmin/users/create" className="ad-btn pri" style={{ marginLeft: "auto" }}>
            <Plus size={16} /> Create profile
          </Link>
        </div>
        {children}
      </main>
    </div>
  );
}
