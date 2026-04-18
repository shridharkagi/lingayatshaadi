"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Heart, Eye, Bookmark, UserX, FileText, Phone } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useProfiles } from "@/contexts/ProfilesContext";
import { useAuth } from "@/contexts/AuthContext";
import { getReceivedInterests, acceptInterest, declineInterest } from "@/lib/api/interests";
import { getProfileById as fetchProfile } from "@/lib/api/profiles";
import { getProfileViews } from "@/lib/api/profileViews";
import { getShortlistedIds, removeFromShortlist } from "@/lib/api/shortlist";
import { getBlockedIds, unblockUser } from "@/lib/api/blocked";
import { getNotes, saveNote } from "@/lib/api/notes";
import { getContactViews, removeContactView, clearContactViews } from "@/lib/api/contactViews";
import { getAge } from "@/lib/utils";
import { getProfileSlug } from "@/lib/memberId";
import type { Profile } from "@/types";
import { 
  loadContactViewHistory, 
  removeContactFromHistory, 
  clearContactViewHistory,
  formatTimeAgo,
  type ContactView 
} from "@/lib/contactViewHistory";

const tabs = [
  { id: "interests", label: "Interests", icon: Heart },
  { id: "views", label: "Profile Views", icon: Eye },
  { id: "contacted", label: "Viewed Contacts", icon: Phone },
  { id: "shortlist", label: "Shortlist", icon: Bookmark },
  { id: "blocked", label: "Blocked", icon: UserX },
  { id: "notes", label: "My Notes", icon: FileText },
];

export default function ActivitiesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { profiles, getProfileById } = useProfiles();
  const [activeTab, setActiveTab] = useState("interests");
  const [receivedInterests, setReceivedInterests] = useState<
    Array<{ id: string; message?: string; fromProfileId: string; profile?: Profile }>
  >([]);
  const [profileViews, setProfileViews] = useState<Array<{ viewerId: string; viewedAt: string; profile?: Profile }>>([]);
  const [shortlistedProfiles, setShortlistedProfiles] = useState<Profile[]>([]);
  const [blockedProfiles, setBlockedProfiles] = useState<Profile[]>([]);
  const [notes, setNotes] = useState<Array<{ profileId: string; note: string; updatedAt: string; profile?: Profile }>>([]);
  const [contactViews, setContactViews] = useState<Array<{ profileId: string; viewedAt: string; profile?: Profile }>>([]);
  const [loading, setLoading] = useState(true);

  const loadInterests = useCallback(async () => {
    if (!user?.id) {
      setReceivedInterests([]);
      setLoading(false);
      return;
    }
    const { data, error } = await getReceivedInterests(user.id);
    if (error || !data.length) {
      setReceivedInterests([]);
    } else {
      const withProfiles = await Promise.all(
        data
          .filter((i) => i.status === "pending")
          .map(async (i) => {
            let profile = getProfileById(i.fromProfileId) || profiles.find((p) => p.id === i.fromProfileId);
            if (!profile) {
              const { data: p } = await fetchProfile(i.fromProfileId);
              profile = p || undefined;
            }
            return {
              id: i.id,
              message: i.message,
              fromProfileId: i.fromProfileId,
              profile: profile ?? undefined,
            };
          })
      );
      setReceivedInterests(withProfiles.filter((r) => r.profile));
    }
    setLoading(false);
  }, [user?.id, getProfileById, profiles]);

  const loadContacted = useCallback(async () => {
    const fromStorage = loadContactViewHistory();
    if (!user?.id) {
      setContactViews(fromStorage.map((c) => ({ profileId: c.profileId, viewedAt: c.viewedAt })));
      return;
    }
    const { data } = await getContactViews(user.id);
    if (data?.length) {
      const withProfiles = await Promise.all(
        data.map(async (v) => {
          let profile = getProfileById(v.viewedId) || profiles.find((p) => p.id === v.viewedId);
          if (!profile) {
            const { data: p } = await fetchProfile(v.viewedId);
            profile = p ?? undefined;
          }
          return { profileId: v.viewedId, viewedAt: v.viewedAt, profile };
        })
      );
      setContactViews(withProfiles.filter((v) => v.profile));
    } else {
      setContactViews(
        fromStorage.map((c) => ({
          profileId: c.profileId,
          viewedAt: c.viewedAt,
          profile: {
            id: c.profileId,
            fullName: c.profileName,
            profilePhoto: c.profilePhoto,
            publicId: c.memberId,
          } as Profile,
        }))
      );
    }
  }, [user?.id, getProfileById, profiles]);

  useEffect(() => {
    if (activeTab === "contacted") loadContacted();
  }, [activeTab, loadContacted]);

  const loadProfileViews = useCallback(async () => {
    if (!user?.id) return;
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
    if (!user?.id) return;
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
    if (!user?.id) return;
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
    if (!user?.id) return;
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
    else if (activeTab === "shortlist") loadShortlist();
    else if (activeTab === "blocked") loadBlocked();
    else if (activeTab === "notes") loadNotes();
  }, [activeTab, loadInterests, loadProfileViews, loadShortlist, loadBlocked, loadNotes]);

  const handleRemoveContact = async (profileId: string) => {
    removeContactFromHistory(profileId);
    if (user?.id) await removeContactView(user.id, profileId);
    loadContacted();
  };

  const handleClearHistory = async () => {
    if (!confirm("Are you sure you want to clear all contact view history?")) return;
    clearContactViewHistory();
    if (user?.id) await clearContactViews(user.id);
    setContactViews([]);
  };

  return (
    <div className="max-w-lg mx-auto pb-6">
      <header className="bg-white border-b border-[var(--border)] px-4 py-4">
        <h1 className="text-xl font-bold text-[var(--foreground)] mb-4">Activities</h1>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                activeTab === id ? "bg-[var(--primary)] text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
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
                <div
                  key={id}
                  className="flex gap-4 p-4 bg-white rounded-2xl shadow-sm"
                >
                  <Link href={`/profile/${getProfileSlug(profile!)}`} className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                    <Image
                      src={profile!.profilePhoto || "/placeholder.svg"}
                      alt={profile!.fullName}
                      width={64}
                      height={64}
                      className="object-cover w-full h-full"
                      unoptimized
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/profile/${getProfileSlug(profile!)}`}>
                      <h4 className="font-semibold text-[var(--foreground)]">{profile!.fullName}</h4>
                    </Link>
                    <p className="text-sm text-gray-500">{getAge(profile!.dateOfBirth)} yrs • {profile!.profession}</p>
                    {message && <p className="text-sm text-gray-600 mt-1">&quot;{message}&quot;</p>}
                    <div className="flex gap-2 mt-2">
                      <Link
                        href={`/messages/${profile!.id}`}
                        onClick={async (e) => {
                          e.preventDefault();
                          await acceptInterest(id, {
                            accepterName: user?.fullName,
                          });
                          loadInterests();
                          router.push(`/messages/${profile!.id}`);
                        }}
                        className="px-4 py-1.5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium"
                      >
                        Accept
                      </Link>
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
            <EmptyState
              icon={Heart}
              title="No interests sent yet"
              description="Start connecting with profiles you like"
              action={{
                label: "Browse Profiles",
                href: "/search",
              }}
            />
          </div>
        )}

        {activeTab === "views" && (
          <div className="space-y-4">
            <h3 className="font-semibold text-[var(--foreground)]">Who viewed your profile</h3>
            {loading && activeTab === "views" ? (
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
                    <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                      <Image
                        src={v.profile!.profilePhoto || "/placeholder.svg"}
                        alt={v.profile!.fullName}
                        width={64}
                        height={64}
                        className="object-cover w-full h-full"
                        unoptimized
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-[var(--foreground)]">{v.profile!.fullName}</h4>
                      <p className="text-sm text-gray-500">{getAge(v.profile!.dateOfBirth)} yrs • {v.profile!.profession}</p>
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
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-[var(--foreground)]">
                Contacts Viewed {contactViews.length > 0 && `(${contactViews.length})`}
              </h3>
              {contactViews.length > 0 && (
                <button 
                  onClick={handleClearHistory}
                  className="text-sm text-red-600 hover:text-red-700 hover:underline transition"
                >
                  Clear All
                </button>
              )}
            </div>
            
            {contactViews.length === 0 ? (
              <EmptyState
                icon={Phone}
                title="No contacts viewed yet"
                description="When you view contact details of profiles, they'll appear here for easy access"
                action={{
                  label: "Browse Profiles",
                  href: "/search",
                }}
              />
            ) : (
              <div className="space-y-3">
                {contactViews.map((c) => (
                  <div
                    key={c.profileId}
                    className="flex gap-4 p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition"
                  >
                    <Link
                      href={`/profile/${c.profile ? getProfileSlug(c.profile) : c.profileId}`}
                      className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0"
                    >
                      <Image
                        src={c.profile?.profilePhoto || "/placeholder.svg"}
                        alt={c.profile?.fullName || "Profile"}
                        width={64}
                        height={64}
                        className="object-cover w-full h-full"
                        unoptimized
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/profile/${c.profile ? getProfileSlug(c.profile) : c.profileId}`}>
                        <h4 className="font-semibold text-[var(--foreground)] hover:text-[var(--primary)] transition">
                          {c.profile?.fullName || "Profile"}
                        </h4>
                      </Link>
                      <p className="text-sm text-gray-500">
                        {c.profile?.publicId || c.profile?.memberId || c.profileId}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Viewed {formatTimeAgo(c.viewedAt)}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Link
                          href={`/profile/${c.profile ? getProfileSlug(c.profile) : c.profileId}`}
                          className="px-4 py-1.5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary)]/90 transition"
                        >
                          View Profile
                        </Link>
                        <button
                          onClick={() => handleRemoveContact(c.profileId)}
                          className="px-4 py-1.5 rounded-lg border border-[var(--border)] text-sm hover:bg-gray-50 transition"
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

        {activeTab === "shortlist" && (
          <div className="space-y-4">
            <h3 className="font-semibold text-[var(--foreground)]">Shortlisted profiles</h3>
            {loading && activeTab === "shortlist" ? (
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
                  <div
                    key={profile.id}
                    className="flex gap-4 p-4 bg-white rounded-2xl shadow-sm"
                  >
                    <Link href={`/profile/${getProfileSlug(profile)}`} className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                      <Image
                        src={profile.profilePhoto || "/placeholder.svg"}
                        alt={profile.fullName}
                        width={64}
                        height={64}
                        className="object-cover w-full h-full"
                        unoptimized
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/profile/${getProfileSlug(profile)}`}>
                        <h4 className="font-semibold text-[var(--foreground)]">{profile.fullName}</h4>
                      </Link>
                      <p className="text-sm text-gray-500">{getAge(profile.dateOfBirth)} yrs • {profile.profession}</p>
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
            {loading && activeTab === "blocked" ? (
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
                  <div
                    key={profile.id}
                    className="flex gap-4 p-4 bg-white rounded-2xl shadow-sm"
                  >
                    <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                      <Image
                        src={profile.profilePhoto || "/placeholder.svg"}
                        alt={profile.fullName}
                        width={64}
                        height={64}
                        className="object-cover w-full h-full"
                        unoptimized
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-[var(--foreground)]">{profile.fullName}</h4>
                      <p className="text-sm text-gray-500">{getAge(profile.dateOfBirth)} yrs • {profile.profession}</p>
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
            {loading && activeTab === "notes" ? (
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
                  <div
                    key={n.profileId}
                    className="flex gap-4 p-4 bg-white rounded-2xl shadow-sm"
                  >
                    <Link href={`/profile/${getProfileSlug(n.profile!)}`} className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                      <Image
                        src={n.profile!.profilePhoto || "/placeholder.svg"}
                        alt={n.profile!.fullName}
                        width={64}
                        height={64}
                        className="object-cover w-full h-full"
                        unoptimized
                      />
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
