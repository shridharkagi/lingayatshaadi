"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { Profile } from "@/types";
import { mockProfiles } from "@/data/mock";
import { generatePublicId } from "@/lib/memberId";

interface ProfilesContextType {
  profiles: Profile[];
  getProfileById: (id: string) => Profile | undefined;
  addProfile: (profile: Partial<Profile> & { email: string; fullName: string; gender: string; dateOfBirth: string }) => Profile;
  updateProfileById: (id: string, updates: Partial<Profile>) => void;
}

const ProfilesContext = createContext<ProfilesContextType | undefined>(undefined);

export function ProfilesProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>(() => [...mockProfiles]);

  const getProfileById = useCallback(
    (id: string) => profiles.find((p) => p.id === id),
    [profiles]
  );

  const addProfile = useCallback(
    (data: Partial<Profile> & { email: string; fullName: string; gender: string; dateOfBirth: string }) => {
      const now = new Date().toISOString().slice(0, 10);
      const publicId = generatePublicId(profiles);
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
      value={{ profiles, getProfileById, addProfile, updateProfileById }}
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
