"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Profile } from "@/types";
import { currentUserProfile } from "@/data/mock";

interface AuthContextType {
  user: Profile | null;
  isLoggedIn: boolean;
  profileComplete: boolean;
  loading: boolean;
  login: (email: string, password: string) => void;
  logout: () => void;
  register: (profile: Partial<Profile> & { email: string }) => void;
  updateProfile: (profile: Partial<Profile>) => void;
  setProfileComplete: (complete: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [profileComplete, setProfileComplete] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }
    try {
      const stored = localStorage.getItem("lingayat_shaadi_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        setIsLoggedIn(true);
        setProfileComplete(parsed.profileComplete ?? true);
      }
    } catch {
      localStorage.removeItem("lingayat_shaadi_user");
    }
    setLoading(false);
  }, []);

  const login = (email: string, _password: string) => {
    const profile = { ...currentUserProfile, email };
    setUser(profile);
    setIsLoggedIn(true);
    setProfileComplete(true);
    localStorage.setItem("lingayat_shaadi_user", JSON.stringify(profile));
  };

  const logout = () => {
    setUser(null);
    setIsLoggedIn(false);
    localStorage.removeItem("lingayat_shaadi_user");
  };

  const register = (profileData: Partial<Profile> & { email: string }) => {
    const newProfile: Profile = {
      ...currentUserProfile,
      ...profileData,
      id: "current",
      memberId: `LS-${Date.now().toString().slice(-4)}`,
      email: profileData.email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Profile;
    setUser(newProfile);
    setIsLoggedIn(true);
    setProfileComplete(true);
    localStorage.setItem("lingayat_shaadi_user", JSON.stringify(newProfile));
  };

  const updateProfile = (updates: Partial<Profile>) => {
    if (user) {
      const updated = { ...user, ...updates };
      setUser(updated);
      localStorage.setItem("lingayat_shaadi_user", JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn,
        profileComplete,
        loading,
        login,
        logout,
        register,
        updateProfile,
        setProfileComplete,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
