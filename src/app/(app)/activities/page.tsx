"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, Eye, Bookmark, UserX, Phone } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProfileAvatar } from "@/components/ui/ProfileAvatar";
import { useProfiles } from "@/contexts/ProfilesContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  getReceivedInterests,
  getSentInterests,
  acceptInterest,
  declineInterest,
  withdrawSentInterest,
} from "@/lib/api/interests";
import { getProfileById as fetchProfile } from "@/lib/api/profiles";
import { getProfileViews } from "@/lib/api/profileViews";
import { getShortlistedIds, removeFromShortlist } from "@/lib/api/shortlist";
import { getBlockedIds, unblockUser } from "@/lib/api/blocked";
import { getContactViews, getContactViewsSummary } from "@/lib/api/contactViews";
import { getAge } from "@/lib/utils";
import { getProfileSlug } from "@/lib/memberId";
import { FEATURE_MESSAGING_ENABLED } from "@/lib/featureFlags";
import type { Profile } from "@/types";
import { getAccountAccessState } from "@/lib/api/accessState";
import { maskLastName, type AccountAccessState } from "@/lib/accessPolicy";
import {
  loadContactViewHistory,
  formatTimeAgo,
} from "@/lib/contactViewHistory";

type TabId = "interests" | "views" | "contacted" | "shortlist" | "blocked";

const tabs: { id: TabId; label: string; icon: typeof Heart }[] = [
  { id: "interests", label: "Interests", icon: Heart },
  { id: "views", label: "Views", icon: Eye },
  { id: "contacted", label: "Contacts", icon: Phone },
  { id: "shortlist", label: "Shortlist", icon: Bookmark },
  { id: "blocked", label: "Blocked", icon: UserX },
];

interface CachedContactInfo {
  fullName: string;
  photo: string;
  memberId: string;
}

function getOrdinalDay(day: number): string {
  const mod10 = day % 10;
  const mod100 = day % 100;
  if (mod10 === 1 && mod100 !== 11) return `${day}st`;
  if (mod10 === 2 && mod100 !== 12) return `${day}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${day}rd`;
  return `${day}th`;
}

function formatViewedAtLabel(timestamp: string): string {
  const now = Date.now();
  const viewedTime = new Date(timestamp).getTime();
  const diffMs = now - viewedTime;
  const diffDays = Math.floor(diffMs / 86400000);

  // Keep relative format for first 2 days, then show exact IST timestamp.
  if (diffDays <= 2) {
    return `Viewed ${formatTimeAgo(timestamp)}`;
  }

  const d = new Date(timestamp);
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(d);
  const day = Number(parts.find((p) => p.type === "day")?.value || "0");
  const month = parts.find((p) => p.type === "month")?.value || "";
  const year = parts.find((p) => p.type === "year")?.value || "";
  const hour = parts.find((p) => p.type === "hour")?.value || "";
  const minute = parts.find((p) => p.type === "minute")?.value || "";
  const dayPeriod = (parts.find((p) => p.type === "dayPeriod")?.value || "").toUpperCase();

  return `Viewed on ${getOrdinalDay(day)} ${month}, ${year} at ${hour}:${minute} ${dayPeriod} IST`;
}

export default function ActivitiesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { profiles, getProfileById } = useProfiles();
  const [activeTab, setActiveTab] = useState<TabId>("interests");
  const [receivedInterests, setReceivedInterests] = useState<
    Array<{ id: string; message?: string; fromProfileId: string; profile?: Profile }>
  >([]);
  const [sentInterests, setSentInterests] = useState<
    Array<{ id: string; status: string; toProfileId: string; profile?: Profile }>
  >([]);
  const [profileViews, setProfileViews] = useState<
    Array<{ viewerId: string; viewedAt: string; viewCount: number; profile?: Profile }>
  >([]);
  const [totalProfileViews, setTotalProfileViews] = useState(0);
  const [shortlistedProfiles, setShortlistedProfiles] = useState<Profile[]>([]);
  const [blockedProfiles, setBlockedProfiles] = useState<Profile[]>([]);
  const [contactViews, setContactViews] = useState<
    Array<{ profileId: string; viewedAt: string; profile?: Profile; cached?: CachedContactInfo }>
  >([]);
  const [contactsTotal, setContactsTotal] = useState(0);
  const [contactsDailyUsed, setContactsDailyUsed] = useState(0);
  const [contactsTotalLimit, setContactsTotalLimit] = useState<number | null>(null);
  const [contactsDailyLimit, setContactsDailyLimit] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabsPinned, setTabsPinned] = useState(false);
  const tabsAnchorRef = useRef<HTMLDivElement | null>(null);
  const [accessState, setAccessState] = useState<AccountAccessState | null>(null);
  const shortlistOwnerId = user?.id || "";
  const canViewSensitiveFields = !!accessState?.hasValidSubscription;

  const isValidTabId = useCallback(
    (value: string | null): value is TabId => !!value && tabs.some((t) => t.id === value),
    []
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const tabFromUrl = new URLSearchParams(window.location.search).get("tab");
    if (!isValidTabId(tabFromUrl)) return;
    if (tabFromUrl !== activeTab) setActiveTab(tabFromUrl);
  }, [isValidTabId]);

  const setTab = useCallback((tab: TabId) => {
    setActiveTab(tab);
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    router.replace(`/activities?${params.toString()}`, { scroll: false });
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) {
      setAccessState(null);
      return;
    }
    void (async () => {
      try {
        const access = await getAccountAccessState();
        if (!cancelled) setAccessState(access);
      } catch {
        if (!cancelled) setAccessState(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const loadInterests = useCallback(async () => {
    if (!user?.id) {
      setReceivedInterests([]);
      setSentInterests([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const resolveProfile = async (pid: string): Promise<Profile | undefined> => {
      let p: Profile | undefined =
        getProfileById(pid) || profiles.find((x) => x.id === pid);
      if (!p) {
        const { data } = await fetchProfile(pid);
        p = data || undefined;
      }
      return p;
    };

    const [recv, sent] = await Promise.all([
      getReceivedInterests(user.id),
      getSentInterests(user.id),
    ]);

    if (recv.error || !recv.data.length) {
      setReceivedInterests([]);
    } else {
      const uniquePendingBySender = new Map<
        string,
        { id: string; message?: string; fromProfileId: string; createdAt: string }
      >();
      recv.data
        .filter((i) => i.status === "pending")
        .forEach((i) => {
          const existing = uniquePendingBySender.get(i.fromProfileId);
          if (!existing || existing.createdAt < i.createdAt) {
            uniquePendingBySender.set(i.fromProfileId, {
              id: i.id,
              message: i.message,
              fromProfileId: i.fromProfileId,
              createdAt: i.createdAt,
            });
          }
        });
      const withProfiles = await Promise.all(
        Array.from(uniquePendingBySender.values()).map(async (i) => ({
            id: i.id,
            message: i.message,
            fromProfileId: i.fromProfileId,
            profile: await resolveProfile(i.fromProfileId),
          }))
      );
      setReceivedInterests(withProfiles.filter((r) => r.profile));
    }

    if (sent.error || !sent.data.length) {
      setSentInterests([]);
    } else {
      const uniqueByReceiver = new Map<
        string,
        { id: string; status: string; toProfileId: string; createdAt: string }
      >();
      sent.data.forEach((i) => {
        const existing = uniqueByReceiver.get(i.toProfileId);
        if (!existing || existing.createdAt < i.createdAt) {
          uniqueByReceiver.set(i.toProfileId, {
            id: i.id,
            status: i.status,
            toProfileId: i.toProfileId,
            createdAt: i.createdAt,
          });
        }
      });
      const withProfiles = await Promise.all(
        Array.from(uniqueByReceiver.values()).map(async (i) => ({
          id: i.id,
          status: i.status,
          toProfileId: i.toProfileId,
          profile: await resolveProfile(i.toProfileId),
        }))
      );
      setSentInterests(withProfiles.filter((r) => r.profile));
    }

    setLoading(false);
  }, [user?.id, getProfileById, profiles]);

  const loadContacted = useCallback(async () => {
    setLoading(true);
    // Build a cache from localStorage so we always have name/photo even if the
    // DB profile lookup fails (deleted profiles, RLS blocks, etc.).
    const fromStorage = loadContactViewHistory();
    const cache = new Map<string, CachedContactInfo>();
    fromStorage.forEach((c) => {
      cache.set(c.profileId, {
        fullName: c.profileName,
        photo: c.profilePhoto,
        memberId: c.memberId,
      });
    });

    let merged: Array<{ profileId: string; viewedAt: string }> = [];
    if (user?.id) {
      const [{ data }, { data: summary }] = await Promise.all([
        getContactViews(user.id),
        getContactViewsSummary(user.id),
      ]);
      const dbList = (data || []).map((v) => ({ profileId: v.viewedId, viewedAt: v.viewedAt }));
      // Merge DB + localStorage by profileId, keeping the most recent viewedAt.
      const byId = new Map<string, { profileId: string; viewedAt: string }>();
      [...dbList, ...fromStorage.map((c) => ({ profileId: c.profileId, viewedAt: c.viewedAt }))].forEach((v) => {
        const existing = byId.get(v.profileId);
        if (!existing || v.viewedAt > existing.viewedAt) byId.set(v.profileId, v);
      });
      merged = Array.from(byId.values()).sort((a, b) => (a.viewedAt < b.viewedAt ? 1 : -1));
      setContactsDailyUsed(summary?.todayUsed || 0);
      setContactsTotalLimit(summary?.totalLimit ?? null);
      setContactsDailyLimit(summary?.dailyLimit ?? null);
    } else {
      merged = fromStorage.map((c) => ({ profileId: c.profileId, viewedAt: c.viewedAt }));
      setContactsDailyUsed(0);
      setContactsTotalLimit(null);
      setContactsDailyLimit(null);
    }

    setContactsTotal(merged.length);
    const enriched = await Promise.all(
      merged.map(async (v) => {
        const cached = cache.get(v.profileId);
        let profile = getProfileById(v.profileId) || profiles.find((p) => p.id === v.profileId);
        if (!profile) {
          const { data: p } = await fetchProfile(v.profileId);
          profile = p ?? undefined;
        }
        return { profileId: v.profileId, viewedAt: v.viewedAt, profile, cached };
      })
    );
    setContactViews(enriched);
    setLoading(false);
  }, [user?.id, getProfileById, profiles]);

  const loadProfileViews = useCallback(async () => {
    if (!user?.id) {
      setProfileViews([]);
      setTotalProfileViews(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await getProfileViews(user.id);
    const allViews = data || [];
    setTotalProfileViews(allViews.length);
    const groupedByViewer = new Map<string, { viewerId: string; viewedAt: string; viewCount: number }>();
    allViews.forEach((view) => {
      const existing = groupedByViewer.get(view.viewerId);
      if (!existing) {
        groupedByViewer.set(view.viewerId, {
          viewerId: view.viewerId,
          viewedAt: view.viewedAt,
          viewCount: 1,
        });
        return;
      }
      groupedByViewer.set(view.viewerId, {
        viewerId: view.viewerId,
        viewedAt: existing.viewedAt > view.viewedAt ? existing.viewedAt : view.viewedAt,
        viewCount: existing.viewCount + 1,
      });
    });
    const groupedViews = Array.from(groupedByViewer.values()).sort((a, b) =>
      a.viewedAt < b.viewedAt ? 1 : -1
    );
    const withProfiles = await Promise.all(
      groupedViews.map(async (v) => {
        let profile = getProfileById(v.viewerId) || profiles.find((p) => p.id === v.viewerId);
        if (!profile) {
          const { data: p } = await fetchProfile(v.viewerId);
          profile = p ?? undefined;
        }
        return { ...v, profile };
      })
    );
    setProfileViews(withProfiles.filter((v) => v.profile));
    setLoading(false);
  }, [user?.id, getProfileById, profiles]);

  const loadShortlist = useCallback(async () => {
    if (!shortlistOwnerId) {
      // Logged-in accounts without a created profile can still save cards.
      // Those saves are stored locally until they create their first profile.
      const raw = typeof window !== "undefined" ? localStorage.getItem("saved_profiles_no_profile") : null;
      let ids: string[] = [];
      try {
        ids = raw ? ((JSON.parse(raw) as string[]) || []) : [];
      } catch {
        ids = [];
      }
      if (!Array.isArray(ids) || ids.length === 0) {
        setShortlistedProfiles([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const profs = await Promise.all(
        ids.map(async (id) => {
          let p = getProfileById(id) || profiles.find((x) => x.id === id);
          if (!p) {
            const { data: d } = await fetchProfile(id);
            p = d ?? undefined;
          }
          return p;
        })
      );
      setShortlistedProfiles(profs.filter((p): p is Profile => !!p));
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await getShortlistedIds(shortlistOwnerId);
    const profs = await Promise.all(
      (data || []).map(async (id) => {
        let p = getProfileById(id) || profiles.find((x) => x.id === id);
        if (!p) {
          const { data: d } = await fetchProfile(id);
          p = d ?? undefined;
        }
        return p;
      })
    );
    setShortlistedProfiles(profs.filter((p): p is Profile => !!p));
    setLoading(false);
  }, [shortlistOwnerId, getProfileById, profiles]);

  const loadBlocked = useCallback(async () => {
    if (!user?.id) {
      setBlockedProfiles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await getBlockedIds(user.id);
    const profs = await Promise.all(
      (data || []).map(async (id) => {
        let p = getProfileById(id) || profiles.find((x) => x.id === id);
        if (!p) {
          const { data: d } = await fetchProfile(id);
          p = d ?? undefined;
        }
        return p;
      })
    );
    setBlockedProfiles(profs.filter((p): p is Profile => !!p));
    setLoading(false);
  }, [user?.id, getProfileById, profiles]);

  useEffect(() => {
    if (activeTab === "interests") loadInterests();
    else if (activeTab === "views") loadProfileViews();
    else if (activeTab === "contacted") loadContacted();
    else if (activeTab === "shortlist") loadShortlist();
    else if (activeTab === "blocked") loadBlocked();
  }, [activeTab, loadInterests, loadProfileViews, loadContacted, loadShortlist, loadBlocked]);

  useEffect(() => {
    const onScroll = () => {
      const anchor = tabsAnchorRef.current;
      if (!anchor) return;
      const { top } = anchor.getBoundingClientRect();
      setTabsPinned(top <= 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const tabCounts = useMemo<Record<TabId, number>>(
    () => ({
      interests: receivedInterests.length + sentInterests.length,
      views: totalProfileViews,
      contacted: contactsTotal,
      shortlist: shortlistedProfiles.length,
      blocked: blockedProfiles.length,
    }),
    [receivedInterests.length, sentInterests.length, totalProfileViews, contactsTotal, shortlistedProfiles.length, blockedProfiles.length]
  );

  return (
    <div className="max-w-2xl mx-auto pb-6">
      <header className="bg-white border-b border-[var(--border)] px-3 sm:px-4 py-4">
        <h1 className="text-xl font-bold text-[var(--foreground)]">Activities</h1>
      </header>

      <div ref={tabsAnchorRef} />
      {tabsPinned && <div className="h-[72px]" />}
      <div
        className={`${tabsPinned ? "fixed top-0 left-0 right-0 z-30" : "relative"} bg-white border-b border-[var(--border)] transition-shadow ${
          tabsPinned ? "shadow-sm" : ""
        }`}
      >
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-2">
          <div
            role="tablist"
            aria-label="Activity sections"
            className="grid grid-cols-5 gap-1"
          >
            {tabs.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;
              const count = tabCounts[id];
              return (
                <button
                  key={id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setTab(id)}
                  className={`relative min-w-0 flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition-colors ${
                    isActive
                      ? "bg-[var(--primary)] text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-[10px] sm:text-[11px] font-medium leading-tight">{label}</span>
                  {count > 0 && (
                    <span
                      className={`absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] sm:text-[10px] font-semibold flex items-center justify-center ${
                        isActive ? "bg-white text-[var(--primary)]" : "bg-[var(--primary)] text-white"
                      }`}
                    >
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="px-2 sm:px-4 py-4">
        {activeTab === "interests" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-[var(--foreground)]">Received</h3>
              <span className="text-xs px-2 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-medium">
                {receivedInterests.length}
              </span>
            </div>
            {loading ? (
              <div className="py-8 text-center text-gray-500">Loading...</div>
            ) : receivedInterests.length === 0 ? (
              <EmptyState
                icon={Heart}
                title="No interests received yet"
                description="When someone sends you an interest, it will appear here"
                compact
              />
            ) : (
              receivedInterests.map(({ id, profile, message }) => (
                <div key={id} className="flex gap-3 sm:gap-4 p-3 sm:p-4 bg-white rounded-2xl shadow-sm">
                  <Link href={`/profile/${getProfileSlug(profile!)}`}>
                    <ProfileAvatar
                      src={profile!.profilePhoto}
                      alt={canViewSensitiveFields ? profile!.fullName : maskLastName(profile!.fullName || "")}
                      size={64}
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/profile/${getProfileSlug(profile!)}`}>
                      <h4 className="font-semibold text-[var(--foreground)]">
                        {canViewSensitiveFields ? profile!.fullName : maskLastName(profile!.fullName || "")}
                      </h4>
                    </Link>
                    <p className="text-sm text-gray-500">
                      {getAge(profile!.dateOfBirth)} yrs • {profile!.profession}
                    </p>
                    {message && <p className="text-sm text-gray-600 mt-1">&quot;{message}&quot;</p>}
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={async () => {
                          await acceptInterest(id, { accepterName: user?.fullName });
                          loadInterests();
                          if (FEATURE_MESSAGING_ENABLED) {
                            router.push(`/messages/${profile!.id}`);
                          }
                        }}
                        className="px-4 py-1.5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium"
                      >
                        Accept
                      </button>
                      <button
                        onClick={async () => {
                          await declineInterest(id);
                          loadInterests();
                        }}
                        className="px-4 py-1.5 rounded-lg border border-[var(--border)] text-sm"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div className="flex items-center justify-between gap-3 mt-6">
              <h3 className="font-semibold text-[var(--foreground)]">Sent</h3>
              <span className="text-xs px-2 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-medium">
                {sentInterests.length}
              </span>
            </div>
            {loading ? (
              <div className="py-8 text-center text-gray-500">Loading...</div>
            ) : sentInterests.length === 0 ? (
              <EmptyState
                icon={Heart}
                title="No interests sent yet"
                description="Start connecting with profiles you like"
                compact
                action={{ label: "Browse Profiles", href: "/search" }}
              />
            ) : (
              <div className="space-y-3">
                {sentInterests.map(({ id, status, profile }) => {
                  const statusStyle =
                    status === "accepted"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : status === "declined"
                      ? "bg-red-50 text-red-700 border-red-200"
                      : "bg-amber-50 text-amber-700 border-amber-200";
                  const statusLabel =
                    status === "accepted"
                      ? "Accepted"
                      : status === "declined"
                      ? "Declined"
                      : "Pending";
                  return (
                    <Link
                      key={id}
                      href={`/profile/${getProfileSlug(profile!)}`}
                      className="flex gap-3 sm:gap-4 p-3 sm:p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition"
                    >
                      <ProfileAvatar
                        src={profile!.profilePhoto}
                        alt={canViewSensitiveFields ? profile!.fullName : maskLastName(profile!.fullName || "")}
                        size={64}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-[var(--foreground)] truncate">
                            {canViewSensitiveFields ? profile!.fullName : maskLastName(profile!.fullName || "")}
                          </h4>
                          <span
                            className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full border ${statusStyle}`}
                          >
                            {statusLabel}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 truncate mt-0.5">
                          {profile!.dateOfBirth ? `${getAge(profile!.dateOfBirth)} yrs` : ""}
                          {profile!.profession ? ` • ${profile!.profession}` : ""}
                          {!profile!.profession && profile!.city ? ` • ${profile!.city}` : ""}
                        </p>
                        {status === "pending" && (
                          <div className="mt-2">
                            <button
                              onClick={async (e) => {
                                e.preventDefault();
                                await withdrawSentInterest(id);
                                await loadInterests();
                              }}
                              className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              Undo interest
                            </button>
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "views" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-[var(--foreground)]">Who viewed your profile</h3>
              <span className="text-xs px-2 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-medium">
                <span className="sm:hidden">Unique: {profileViews.length}</span>
                <span className="hidden sm:inline">Unique viewers: {profileViews.length}</span>
              </span>
            </div>
            {loading ? (
              <div className="py-8 text-center text-gray-500">Loading...</div>
            ) : profileViews.length === 0 ? (
              <EmptyState
                icon={Eye}
                title="No profile views yet"
                description="When someone views your profile, you'll see them here"
              />
            ) : (
              <div className="space-y-3">
                {profileViews.map((v, idx) => (
                  <Link
                    key={`${v.viewerId}-${v.viewedAt}-${idx}`}
                    href={`/profile/${getProfileSlug(v.profile!)}`}
                    className="flex gap-3 sm:gap-4 p-3 sm:p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition"
                  >
                    <ProfileAvatar
                      src={v.profile!.profilePhoto}
                      alt={canViewSensitiveFields ? v.profile!.fullName : maskLastName(v.profile!.fullName || "")}
                      size={64}
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-[var(--foreground)]">
                        {canViewSensitiveFields ? v.profile!.fullName : maskLastName(v.profile!.fullName || "")}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {getAge(v.profile!.dateOfBirth)} yrs • {v.profile!.profession}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Viewed {formatTimeAgo(v.viewedAt)}
                        {v.viewCount > 1 ? ` (${v.viewCount} views)` : ""}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "contacted" && (
          <div className="space-y-4">
            {/* Total counter card on top */}
            <div className="relative overflow-hidden bg-gradient-to-r from-[var(--primary)] to-[#f19a4b] text-white rounded-2xl px-4 sm:px-5 py-3.5 sm:py-4 shadow-sm">
              <div className="absolute -right-8 -top-10 w-20 h-20 rounded-full bg-white/8" />
              <div className="absolute -right-4 -bottom-10 w-16 h-16 rounded-full bg-white/8" />

              <div className="relative z-[1]">
                <span className="absolute right-0 top-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/25 backdrop-blur-[1px] border border-white/35 shadow-sm">
                  <Phone size={16} className="text-white" />
                </span>
                <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.14em] text-white/85 font-semibold">
                  Contacts Viewed
                </p>

                <div className="mt-2.5 space-y-2">
                  <div className="rounded-xl bg-white/14 border border-white/20 px-3 py-1.5">
                    <p className="text-[10px] sm:text-[11px] text-white/85 uppercase tracking-wide">Total</p>
                    <p className="text-sm sm:text-base font-semibold leading-tight mt-0.5">
                      {contactsTotalLimit && contactsTotalLimit > 0
                        ? `${contactsTotal} of ${contactsTotalLimit} contacts viewed`
                        : `${contactsTotal} contacts viewed`}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/14 border border-white/20 px-3 py-1.5">
                    <p className="text-[10px] sm:text-[11px] text-white/85 uppercase tracking-wide">Today</p>
                    <p className="text-sm sm:text-base font-semibold leading-tight mt-0.5">
                      {contactsDailyLimit && contactsDailyLimit > 0
                        ? `${contactsDailyUsed} of ${contactsDailyLimit} contacts viewed`
                        : `${contactsDailyUsed} contacts viewed today`}
                    </p>
                  </div>
                </div>

              </div>
            </div>

            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[var(--foreground)]">
                Contacted profiles {contactsTotal > 0 ? `(${contactsTotal})` : ""}
              </h3>
            </div>

            {loading ? (
              <div className="py-8 text-center text-gray-500">Loading...</div>
            ) : contactViews.length === 0 ? (
              <EmptyState
                icon={Phone}
                title="No contacts viewed yet"
                description="When you view contact details of profiles, they'll appear here for easy access"
                action={{ label: "Browse Profiles", href: "/search" }}
              />
            ) : (
              <div className="space-y-3">
                {contactViews.map((c, idx) => {
                  const name = c.profile?.fullName || c.cached?.fullName || "Profile";
                  const photo = c.profile?.profilePhoto || c.cached?.photo;
                  const memberId = c.profile?.publicId || c.profile?.memberId || c.cached?.memberId;
                  const meta: string[] = [];
                  if (c.profile?.dateOfBirth) meta.push(`${getAge(c.profile.dateOfBirth)} yrs`);
                  if (c.profile?.profession) meta.push(c.profile.profession);
                  else if (c.profile?.city) meta.push(c.profile.city);
                  const profileHref = c.profile
                    ? `/profile/${getProfileSlug(c.profile)}`
                    : c.cached?.memberId
                      ? `/profile/${c.cached.memberId}`
                      : null;
                  const cardClassName =
                    "flex flex-wrap gap-x-3 gap-y-1 sm:gap-x-4 sm:gap-y-2 p-3 sm:p-4 bg-white rounded-2xl shadow-sm transition";
                  return (
                    profileHref ? (
                      <Link
                        key={`${c.profileId}-${c.viewedAt}-${idx}`}
                        href={profileHref}
                        className={`${cardClassName} hover:shadow-md`}
                      >
                        <ProfileAvatar src={photo} alt={name} size={64} />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-[var(--foreground)] truncate">{name}</h4>
                          {memberId && (
                            <p className="text-xs text-gray-400 mt-0.5 truncate">{memberId}</p>
                          )}
                          {meta.length > 0 && (
                            <p className="text-[13px] sm:text-sm text-gray-500 mt-0.5 leading-snug truncate">
                              {meta.join(" • ")}
                            </p>
                          )}
                        </div>
                        <div className="basis-full" />
                        <p className="w-full text-xs text-gray-400 leading-tight">
                          {formatViewedAtLabel(c.viewedAt)}
                        </p>
                      </Link>
                    ) : (
                      <div
                        key={`${c.profileId}-${c.viewedAt}-${idx}`}
                        className={`${cardClassName} opacity-90`}
                        title="Profile link unavailable"
                      >
                        <ProfileAvatar src={photo} alt={name} size={64} />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-[var(--foreground)] truncate">{name}</h4>
                          {memberId && (
                            <p className="text-xs text-gray-400 mt-0.5 truncate">{memberId}</p>
                          )}
                          {meta.length > 0 && (
                            <p className="text-[13px] sm:text-sm text-gray-500 mt-0.5 leading-snug truncate">
                              {meta.join(" • ")}
                            </p>
                          )}
                        </div>
                        <div className="basis-full" />
                        <p className="w-full text-xs text-gray-400 leading-tight">
                          {formatViewedAtLabel(c.viewedAt)}
                        </p>
                      </div>
                    )
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "shortlist" && (
          <div className="space-y-4">
            <h3 className="font-semibold text-[var(--foreground)]">Shortlisted profiles</h3>
            {loading ? (
              <div className="py-8 text-center text-gray-500">Loading...</div>
            ) : shortlistedProfiles.length === 0 ? (
              <EmptyState
                icon={Bookmark}
                title="No shortlisted profiles"
                description="Save profiles you're interested in for quick access later"
                action={{ label: "Browse Profiles", href: "/search" }}
              />
            ) : (
              <div className="space-y-3">
                {shortlistedProfiles.map((profile) => (
                  <div key={profile.id} className="flex gap-3 sm:gap-4 p-3 sm:p-4 bg-white rounded-2xl shadow-sm">
                    <Link href={`/profile/${getProfileSlug(profile)}`}>
                      <ProfileAvatar src={profile.profilePhoto} alt={profile.fullName} size={64} />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/profile/${getProfileSlug(profile)}`}>
                        <h4 className="font-semibold text-[var(--foreground)]">
                          {canViewSensitiveFields ? profile.fullName : maskLastName(profile.fullName || "")}
                        </h4>
                      </Link>
                      <p className="text-sm text-gray-500">
                        {getAge(profile.dateOfBirth)} yrs • {profile.profession}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Link
                          href={`/profile/${getProfileSlug(profile)}`}
                          className="px-4 py-1.5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium"
                        >
                          View
                        </Link>
                        <button
                          onClick={async () => {
                            if (!shortlistOwnerId) {
                              const raw = typeof window !== "undefined" ? localStorage.getItem("saved_profiles_no_profile") : null;
                              let ids: string[] = [];
                              try {
                                ids = raw ? ((JSON.parse(raw) as string[]) || []) : [];
                              } catch {
                                ids = [];
                              }
                              const next = ids.filter((id) => id !== profile.id);
                              if (typeof window !== "undefined") {
                                localStorage.setItem("saved_profiles_no_profile", JSON.stringify(next));
                              }
                              await loadShortlist();
                              return;
                            }
                            await removeFromShortlist(shortlistOwnerId, profile.id);
                            loadShortlist();
                          }}
                          className="px-4 py-1.5 rounded-lg border border-[var(--border)] text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "blocked" && (
          <div className="space-y-4">
            <h3 className="font-semibold text-[var(--foreground)]">Blocked users</h3>
            {loading ? (
              <div className="py-8 text-center text-gray-500">Loading...</div>
            ) : blockedProfiles.length === 0 ? (
              <EmptyState
                icon={UserX}
                title="No blocked users"
                description="Users you block will appear here"
              />
            ) : (
              <div className="space-y-3">
                {blockedProfiles.map((profile) => (
                  <div key={profile.id} className="flex gap-3 sm:gap-4 p-3 sm:p-4 bg-white rounded-2xl shadow-sm">
                    <ProfileAvatar src={profile.profilePhoto} alt={profile.fullName} size={64} />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-[var(--foreground)]">{profile.fullName}</h4>
                      <p className="text-sm text-gray-500">
                        {getAge(profile.dateOfBirth)} yrs • {profile.profession}
                      </p>
                      <button
                        onClick={async () => {
                          if (!user?.id) return;
                          await unblockUser(user.id, profile.id);
                          loadBlocked();
                        }}
                        className="mt-2 px-4 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm"
                      >
                        Unblock
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
