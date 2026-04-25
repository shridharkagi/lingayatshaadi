"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Profile } from "@/types";
import { mockProfiles } from "@/data/mock";
import { generatePublicId } from "@/lib/memberId";
import { searchProfiles } from "@/lib/api/profiles";
import { withTimeout } from "@/lib/withTimeout";
import { useAuth } from "@/contexts/AuthContext";

const PROFILE_LIST_TIMEOUT_MS = 14_000;

interface ProfilesContextType {
  profiles: Profile[];
  profilesLoading: boolean;
  refreshProfiles: () => Promise<void>;
  getProfileById: (id: string) => Profile | undefined;
  addProfile: (
    profile: Partial<Profile> & {
      email: string;
      fullName: string;
      gender: Profile["gender"];
      dateOfBirth: string;
    }
  ) => Profile;
  updateProfileById: (id: string, updates: Partial<Profile>) => void;
}

const ProfilesContext = createContext<ProfilesContextType | undefined>(undefined);

export function ProfilesProvider({ children }: { children: React.ReactNode }) {
  const { user: currentUser } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>(() => []);
  const [profilesLoading, setProfilesLoading] = useState(true);

  const currentUserId = currentUser?.id;

  const refreshProfiles = useCallback(async () => {
    setProfilesLoading(true);
    try {
      const { data, error } = await withTimeout(
        searchProfiles({}, 48),
        PROFILE_LIST_TIMEOUT_MS,
        "Profile list"
      );
      if (!error && data.length > 0) {
        const filtered = currentUserId
          ? data.filter((p) => p.id !== currentUserId)
          : data;
        setProfiles(filtered);
      } else {
        setProfiles([...mockProfiles]);
      }
    } catch {
      setProfiles([...mockProfiles]);
    } finally {
      setProfilesLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await withTimeout(
          searchProfiles({}, 48),
          PROFILE_LIST_TIMEOUT_MS,
          "Profile list"
        );
        if (cancelled) return;
        if (!error && data.length > 0) {
          const filtered = currentUserId
            ? data.filter((p) => p.id !== currentUserId)
            : data;
          setProfiles(filtered);
        } else {
          setProfiles([...mockProfiles]);
        }
      } catch {
        if (!cancelled) setProfiles([...mockProfiles]);
      } finally {
        if (!cancelled) setProfilesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  const getProfileById = useCallback(
    (id: string) =>
      profiles.find((p) => p.id === id || (p.publicId || p.memberId || "").toLowerCase() === id.toLowerCase()),
    [profiles]
  );

  const addProfile = useCallback(
    (
      data: Partial<Profile> & {
        email: string;
        fullName: string;
        gender: Profile["gender"];
        dateOfBirth: string;
      }
    ) => {
      const now = new Date().toISOString().slice(0, 10);
      const publicId = generatePublicId(profiles, data.gender);
      const id = `profile-${Date.now()}`;
      const newProfile: Profile = {
        ...data,
        id,
        publicId,
        memberId: publicId,
        fullName: data.fullName || "",
        dateOfBirth: data.dateOfBirth || "",
        gender: data.gender || "male",
        maritalStatus: data.maritalStatus || "",
        caste: data.caste || "Lingayat",
        subCaste: data.subCaste || "",
        height: data.height || "",
        aboutMe: data.aboutMe || "",
        aboutMeVisible: data.aboutMeVisible ?? true,
        email: data.email || "",
        createdAt: now,
        updatedAt: now,
      } as Profile;
      setProfiles((prev) => [...prev, newProfile]);
      return newProfile;
    },
    [profiles]
  );

  const updateProfileById = useCallback((id: string, updates: Partial<Profile>) => {
    const now = new Date().toISOString().slice(0, 10);
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: now } : p
      )
    );
  }, []);

  return (
    <ProfilesContext.Provider
      value={{ profiles, profilesLoading, refreshProfiles, getProfileById, addProfile, updateProfileById }}
    >
      {children}
    </ProfilesContext.Provider>
  );
}

export function useProfiles() {
  const context = useContext(ProfilesContext);
  if (context === undefined) {
    throw new Error("useProfiles must be used within a ProfilesProvider");
  }
  return context;
}
