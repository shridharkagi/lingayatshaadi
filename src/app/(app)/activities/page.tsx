"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, Eye, Bookmark, UserX, FileText, Phone } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProfileAvatar } from "@/components/ui/ProfileAvatar";
import { useProfiles } from "@/contexts/ProfilesContext";
import { useAuth } from "@/contexts/AuthContext";
import { getReceivedInterests, getSentInterests, acceptInterest, declineInterest } from "@/lib/api/interests";
import { getProfileById as fetchProfile } from "@/lib/api/profiles";
import { getProfileViews } from "@/lib/api/profileViews";
import { getShortlistedIds, removeFromShortlist } from "@/lib/api/shortlist";
import { getBlockedIds, unblockUser } from "@/lib/api/blocked";
import { getNotes } from "@/lib/api/notes";
import { getContactViews } from "@/lib/api/contactViews";
import { getAge } from "@/lib/utils";
import { getProfileSlug } from "@/lib/memberId";
import { FEATURE_MESSAGING_ENABLED } from "@/lib/featureFlags";
import type { Profile } from "@/types";
import {
  loadContactViewHistory,
  formatTimeAgo,
} from "@/lib/contactViewHistory";

type TabId = "interests" | "views" | "contacted" | "shortlist" | "blocked" | "notes";

const tabs: { id: TabId; label: string; icon: typeof Heart }[] = [
  { id: "interests", label: "Interests", icon: Heart },
  { id: "views", label: "Views", icon: Eye },
  { id: "contacted", label: "Contacts", icon: Phone },
  { id: "shortlist", label: "Shortlist", icon: Bookmark },
  { id: "blocked", label: "Blocked", icon: UserX },
  { id: "notes", label: "Notes", icon: FileText },
];

const RECENT_CONTACTS_LIMIT = 20;

interface CachedContactInfo {
  fullName: string;
  photo: string;
  memberId: string;
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
    Array<{ viewerId: string; viewedAt: string; profile?: Profile }>
  >([]);
  const [shortlistedProfiles, setShortlistedProfiles] = useState<Profile[]>([]);
  const [blockedProfiles, setBlockedProfiles] = useState<Profile[]>([]);
  const [notes, setNotes] = useState<
    Array<{ profileId: string; note: string; updatedAt: string; profile?: Profile }>
  >([]);
  const [contactViews, setContactViews] = useState<
    Array<{ profileId: string; viewedAt: string; profile?: Profile; cached?: CachedContactInfo }>
  >([]);
  const [contactsTotal, setContactsTotal] = useState(0);
  const [loading, setLoading] = useState(true);

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
      const withProfiles = await Promise.all(
        recv.data
          .filter((i) => i.status === "pending")
          .map(async (i) => ({
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
      const withProfiles = await Promise.all(
        sent.data.map(async (i) => ({
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
      const { data } = await getContactViews(user.id);
      const dbList = (data || []).map((v) => ({ profileId: v.viewedId, viewedAt: v.viewedAt }));
      // Merge DB + localStorage by profileId, keeping the most recent viewedAt.
      const byId = new Map<string, { profileId: string; viewedAt: string }>();
      [...dbList, ...fromStorage.map((c) => ({ profileId: c.profileId, viewedAt: c.viewedAt }))].forEach((v) => {
        const existing = byId.get(v.profileId);
        if (!existing || v.viewedAt > existing.viewedAt) byId.set(v.profileId, v);
      });
      merged = Array.from(byId.values()).sort((a, b) => (a.viewedAt < b.viewedAt ? 1 : -1));
    } else {
      merged = fromStorage.map((c) => ({ profileId: c.profileId, viewedAt: c.viewedAt }));
    }

    setContactsTotal(merged.length);
    const recent = merged.slice(0, RECENT_CONTACTS_LIMIT);

    const enriched = await Promise.all(
      recent.map(async (v) => {
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
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await getProfileViews(user.id);
    const withProfiles = await Promise.all(
      (data || []).map(async (v) => {
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
    if (!user?.id) {
      setShortlistedProfiles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await getShortlistedIds(user.id);
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
  }, [user?.id, getProfileById, profiles]);

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

  const loadNotes = useCallback(async () => {
    if (!user?.id) {
      setNotes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await getNotes(user.id);
    const withProfiles = await Promise.all(
      (data || []).map(async (n) => {
        let profile = getProfileById(n.profileId) || profiles.find((p) => p.id === n.profileId);
        if (!profile) {
          const { data: p } = await fetchProfile(n.profileId);
          profile = p ?? undefined;
        }
        return { ...n, profile };
      })
    );
    setNotes(withProfiles.filter((n) => n.profile));
    setLoading(false);
  }, [user?.id, getProfileById, profiles]);

  useEffect(() => {
    if (activeTab === "interests") loadInterests();
    else if (activeTab === "views") loadProfileViews();
    else if (activeTab === "contacted") loadContacted();
    else if (activeTab === "shortlist") loadShortlist();
    else if (activeTab === "blocked") loadBlocked();
    else if (activeTab === "notes") loadNotes();
  }, [activeTab, loadInterests, loadProfileViews, loadContacted, loadShortlist, loadBlocked, loadNotes]);

  const tabCounts = useMemo<Record<TabId, number>>(
    () => ({
      interests: receivedInterests.length + sentInterests.length,
      views: profileViews.length,
      contacted: contactsTotal,
      shortlist: shortlistedProfiles.length,
      blocked: blockedProfiles.length,
      notes: notes.length,
    }),
    [receivedInterests.length, sentInterests.length, profileViews.length, contactsTotal, shortlistedProfiles.length, blockedProfiles.length, notes.length]
  );

  return (
    <div className="max-w-2xl mx-auto pb-6">
      <header className="bg-white border-b border-[var(--border)] px-4 py-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-[var(--foreground)] mb-3">Activities</h1>
        {/* Icon-bar tabs: 6 columns, all visible at once on every screen size. */}
        <div role="tablist" aria-label="Activity sections" className="grid grid-cols-6 gap-1">
          {tabs.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            const count = tabCounts[id];
            return (
              <button
                key={id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(id)}
                className={`relative flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition-colors ${
                  isActive
                    ? "bg-[var(--primary)] text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Icon size={20} />
                <span className="text-[11px] font-medium leading-tight">{label}</span>
                {count > 0 && (
                  <span
                    className={`absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold flex items-center justify-center ${
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
      </header>

      <div className="p-4">
        {activeTab === "interests" && (
          <div className="space-y-4">
            <h3 className="font-semibold text-[var(--foreground)]">Received</h3>
            {loading ? (
              <div className="py-8 text-center text-gray-500">Loading...</div>
            ) : receivedInterests.length === 0 ? (
              <EmptyState
                icon={Heart}
                title="No interests received yet"
                description="When someone sends you an interest, it will appear here"
              />
            ) : (
              receivedInterests.map(({ id, profile, message }) => (
                <div key={id} className="flex gap-4 p-4 bg-white rounded-2xl shadow-sm">
                  <Link href={`/profile/${getProfileSlug(profile!)}`}>
                    <ProfileAvatar src={profile!.profilePhoto} alt={profile!.fullName} size={64} />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/profile/${getProfileSlug(profile!)}`}>
                      <h4 className="font-semibold text-[var(--foreground)]">{profile!.fullName}</h4>
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
            <h3 className="font-semibold text-[var(--foreground)] mt-8">Sent</h3>
            {loading ? (
              <div className="py-8 text-center text-gray-500">Loading...</div>
            ) : sentInterests.length === 0 ? (
              <EmptyState
                icon={Heart}
                title="No interests sent yet"
                description="Start connecting with profiles you like"
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
                      className="flex gap-4 p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition"
                    >
                      <ProfileAvatar src={profile!.profilePhoto} alt={profile!.fullName} size={64} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-[var(--foreground)] truncate">
                            {profile!.fullName}
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
            <h3 className="font-semibold text-[var(--foreground)]">Who viewed your profile</h3>
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
                {profileViews.map((v) => (
                  <Link
                    key={v.viewerId}
                    href={`/profile/${getProfileSlug(v.profile!)}`}
                    className="flex gap-4 p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition"
                  >
                    <ProfileAvatar src={v.profile!.profilePhoto} alt={v.profile!.fullName} size={64} />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-[var(--foreground)]">{v.profile!.fullName}</h4>
                      <p className="text-sm text-gray-500">
                        {getAge(v.profile!.dateOfBirth)} yrs • {v.profile!.profession}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">Viewed {formatTimeAgo(v.viewedAt)}</p>
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
            <div className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary)]/80 text-white rounded-2xl px-5 py-4 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs uppercase tracking-wide opacity-90">Total Contacts Viewed</p>
                <p className="text-3xl font-bold leading-tight">{contactsTotal}</p>
              </div>
              <Phone size={36} className="opacity-80" />
            </div>

            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[var(--foreground)]">
                Recent {Math.min(contactsTotal, RECENT_CONTACTS_LIMIT) > 0 && `(${Math.min(contactsTotal, RECENT_CONTACTS_LIMIT)})`}
              </h3>
              {contactsTotal > RECENT_CONTACTS_LIMIT && (
                <span className="text-xs text-gray-500">
                  Showing latest {RECENT_CONTACTS_LIMIT} of {contactsTotal}
                </span>
              )}
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
                {contactViews.map((c) => {
                  const name = c.profile?.fullName || c.cached?.fullName || "Profile";
                  const photo = c.profile?.profilePhoto || c.cached?.photo;
                  const memberId = c.profile?.publicId || c.profile?.memberId || c.cached?.memberId;
                  const meta: string[] = [];
                  if (c.profile?.dateOfBirth) meta.push(`${getAge(c.profile.dateOfBirth)} yrs`);
                  if (c.profile?.profession) meta.push(c.profile.profession);
                  else if (c.profile?.city) meta.push(c.profile.city);
                  const slug = c.profile ? getProfileSlug(c.profile) : c.profileId;
                  return (
                    <Link
                      key={c.profileId}
                      href={`/profile/${slug}`}
                      className="flex gap-4 p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition"
                    >
                      <ProfileAvatar src={photo} alt={name} size={64} />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-[var(--foreground)] truncate">{name}</h4>
                        {memberId && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{memberId}</p>
                        )}
                        {meta.length > 0 && (
                          <p className="text-sm text-gray-500 mt-1">{meta.join(" • ")}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          Viewed {formatTimeAgo(c.viewedAt)}
                        </p>
                      </div>
                    </Link>
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
                  <div key={profile.id} className="flex gap-4 p-4 bg-white rounded-2xl shadow-sm">
                    <Link href={`/profile/${getProfileSlug(profile)}`}>
                      <ProfileAvatar src={profile.profilePhoto} alt={profile.fullName} size={64} />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/profile/${getProfileSlug(profile)}`}>
                        <h4 className="font-semibold text-[var(--foreground)]">{profile.fullName}</h4>
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
                            if (!user?.id) return;
                            await removeFromShortlist(user.id, profile.id);
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
                  <div key={profile.id} className="flex gap-4 p-4 bg-white rounded-2xl shadow-sm">
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

        {activeTab === "notes" && (
          <div className="space-y-4">
            <h3 className="font-semibold text-[var(--foreground)]">My notes</h3>
            {loading ? (
              <div className="py-8 text-center text-gray-500">Loading...</div>
            ) : notes.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No notes saved"
                description="Add personal notes to profiles from the profile page to remember important details"
                action={{ label: "Browse Profiles", href: "/search" }}
              />
            ) : (
              <div className="space-y-3">
                {notes.map((n) => (
                  <div key={n.profileId} className="flex gap-4 p-4 bg-white rounded-2xl shadow-sm">
                    <Link href={`/profile/${getProfileSlug(n.profile!)}`}>
                      <ProfileAvatar src={n.profile!.profilePhoto} alt={n.profile!.fullName} size={64} />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/profile/${getProfileSlug(n.profile!)}`}>
                        <h4 className="font-semibold text-[var(--foreground)]">{n.profile!.fullName}</h4>
                      </Link>
                      <p className="text-sm text-gray-600 mt-1">{n.note}</p>
                      <p className="text-xs text-gray-400 mt-1">Updated {formatTimeAgo(n.updatedAt)}</p>
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
