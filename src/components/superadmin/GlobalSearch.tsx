"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, UserRound, UsersRound } from "lucide-react";
import { adminFetch } from "@/lib/api/adminClient";

type AccountHit = {
  id: string;
  phone: string | null;
  name: string;
  accountCode: string | null;
  suspended: boolean;
  profileCount: number;
};
type ProfileHit = {
  id: string;
  publicId: string | null;
  name: string | null;
  gender: string | null;
  city: string | null;
  status: string | null;
  deleted: boolean;
  photo: string | null;
};

const STATUS_CHIP: Record<string, string> = {
  approved: "t-green",
  pending_review: "t-amber",
  draft: "t-grey",
  rejected: "t-rose",
};

function initials(name: string | null | undefined) {
  const parts = (name || "?").trim().split(/\s+/);
  return ((parts[0]?.[0] || "?") + (parts[1]?.[0] || "")).toUpperCase();
}

function formatPhone(p: string | null) {
  const d = (p || "").replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
  return d.length === 10 ? `${d.slice(0, 5)} ${d.slice(5)}` : p || "—";
}

/** Global search: accounts by phone / U-code / name, profiles by LB-ID / name / phone. ⌘K / Ctrl+K focuses. */
export default function GlobalSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<AccountHit[]>([]);
  const [profiles, setProfiles] = useState<ProfileHit[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setAccounts([]);
      setProfiles([]);
      return;
    }
    setLoading(true);
    const ctrl = { cancelled: false };
    const t = setTimeout(async () => {
      try {
        const res = await adminFetch(`/api/superadmin/search?q=${encodeURIComponent(term)}`);
        const json = res.ok ? await res.json() : { accounts: [], profiles: [] };
        if (ctrl.cancelled) return;
        setAccounts(json.accounts || []);
        setProfiles(json.profiles || []);
        setActive(0);
      } finally {
        if (!ctrl.cancelled) setLoading(false);
      }
    }, 220);
    return () => {
      ctrl.cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  const links = useMemo(
    () => [
      ...accounts.map((a) => `/superadmin/users?focus=${a.id}`),
      ...profiles.map((p) => `/superadmin/users/${p.id}/edit`),
    ],
    [accounts, profiles]
  );

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(links.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && links[active]) {
      e.preventDefault();
      go(links[active]);
    }
  };

  const showPanel = open && q.trim().length >= 2;
  let idx = -1;

  return (
    <div className="ad-search" ref={boxRef}>
      <label className="ad-search-box">
        <Search size={18} aria-hidden="true" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search phone, LB-ID, U-code or name…"
          aria-label="Search accounts and profiles"
        />
        <span className="ad-kbd">⌘K</span>
      </label>
      {showPanel && (
        <div className="ad-results" role="listbox">
          {loading && accounts.length + profiles.length === 0 && <div className="ad-res ad-muted">Searching…</div>}
          {!loading && accounts.length + profiles.length === 0 && (
            <div className="ad-res ad-muted">No accounts or profiles match “{q.trim()}”.</div>
          )}
          {accounts.length > 0 && <div className="ad-res-h">Accounts</div>}
          {accounts.map((a) => {
            idx += 1;
            const i = idx;
            return (
              <Link key={a.id} href={links[i]} className={`ad-res ${active === i ? "on" : ""}`} onClick={() => go(links[i])}>
                <span className="ad-av" style={{ background: "#3f46b8" }}>
                  <UsersRound size={16} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <strong>{a.name || "Unnamed account"}</strong>
                  <span className="ad-muted" style={{ display: "block", fontSize: 12 }}>
                    {formatPhone(a.phone)} · {a.accountCode || "no code"} · {a.profileCount} profile{a.profileCount === 1 ? "" : "s"}
                  </span>
                </span>
                {a.suspended && <span className="ad-chip t-rose">Suspended</span>}
              </Link>
            );
          })}
          {profiles.length > 0 && <div className="ad-res-h">Profiles</div>}
          {profiles.map((p) => {
            idx += 1;
            const i = idx;
            return (
              <Link key={p.id} href={links[i]} className={`ad-res ${active === i ? "on" : ""}`} onClick={() => go(links[i])}>
                <span className="ad-av" style={{ background: p.gender === "female" ? "#c2367a" : "#5b3aa8" }}>
                  {p.photo ? <img src={p.photo} alt="" /> : p.name ? initials(p.name) : <UserRound size={16} />}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <strong>{p.name || "Unnamed profile"}</strong>
                  <span className="ad-muted" style={{ display: "block", fontSize: 12 }}>
                    {p.publicId || "no ID yet"} · {p.gender === "female" ? "Bride" : p.gender === "male" ? "Groom" : "—"}
                    {p.city ? ` · ${p.city}` : ""}
                  </span>
                </span>
                {p.deleted ? (
                  <span className="ad-chip t-rose">Deleted</span>
                ) : (
                  <span className={`ad-chip ${STATUS_CHIP[p.status || ""] || "t-grey"}`}>
                    {(p.status || "unknown").replace("_", " ")}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
