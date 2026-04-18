"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Profile } from "@/types";
import { createSupabaseClient } from "@/lib/supabase";
import { fromProfileRow } from "@/lib/profileMapper";
import { upsertProfile } from "@/lib/api/profiles";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: Profile | null;
  authUser: User | null;
  isLoggedIn: boolean;
  profileComplete: boolean;
  loading: boolean;
  sendOtp: (email: string) => Promise<{ error?: string }>;
  sendPhoneOtp: (phone: string) => Promise<{ error?: string }>;
  verifyOtp: (email: string, token: string) => Promise<{ error?: string }>;
  /** Optional password for registration (stored on new auth user). Omit for login OTP. */
  verifyPhoneOtp: (phone: string, token: string, password?: string) => Promise<{ error?: string }>;
  signInWithPhonePassword: (phone: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (profile: Partial<Profile>) => void;
  setProfileComplete: (complete: boolean) => void;
  /** Save profile to Supabase (create or update). Returns error message if failed. */
  saveProfile: (profile: Partial<Profile> & { email: string; fullName: string; dateOfBirth: string; gender: Profile["gender"] }) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profileComplete, setProfileComplete] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseClient();

  const fetchProfile = async (authUserId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", authUserId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setUser(fromProfileRow(data));
        setProfileComplete(!!data.full_name && !!data.date_of_birth);
      } else {
        setUser(null);
        setProfileComplete(false);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      setUser(null);
      setProfileComplete(false);
    }
  };

  const refreshProfile = async () => {
    if (authUser) {
      await fetchProfile(authUser.id);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setAuthUser(session.user);
        setIsLoggedIn(true);
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setAuthUser(session.user);
          setIsLoggedIn(true);
          await fetchProfile(session.user.id);
        } else {
          setAuthUser(null);
          setUser(null);
          setIsLoggedIn(false);
          setProfileComplete(false);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const sendOtp = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) return { error: error.message };
      return {};
    } catch (error) {
      return { error: "Failed to send OTP" };
    }
  };

  const verifyOtp = async (email: string, token: string) => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      });

      if (error) return { error: error.message };
      return {};
    } catch (error) {
      return { error: "Failed to verify OTP" };
    }
  };

  /** SMS via API HOME + server-stored OTP; see /api/auth/phone/send */
  const sendPhoneOtp = async (phone: string) => {
    try {
      const res = await fetch("/api/auth/phone/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) return { error: data.error || "Failed to send SMS OTP" };
      return {};
    } catch {
      return { error: "Failed to send SMS OTP" };
    }
  };

  const signInWithPhonePassword = async (phone: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ phone, password });
      if (error) return { error: error.message };
      return {};
    } catch {
      return { error: "Sign in failed" };
    }
  };

  /** Verifies OTP and establishes Supabase session (tokens from /api/auth/phone/verify) */
  const verifyPhoneOtp = async (phone: string, token: string, password?: string) => {
    try {
      const res = await fetch("/api/auth/phone/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp: token, ...(password ? { password } : {}) }),
      });
      const data = (await res.json()) as {
        error?: string;
        access_token?: string;
        refresh_token?: string;
      };
      if (!res.ok) {
        return { error: data.error || "Failed to verify SMS OTP" };
      }
      if (!data.access_token || !data.refresh_token) {
        return { error: "Invalid response from server" };
      }
      const { error } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (error) return { error: error.message };
      return {};
    } catch {
      return { error: "Failed to verify SMS OTP" };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAuthUser(null);
    setIsLoggedIn(false);
    setProfileComplete(false);
  };

  const updateProfile = (updates: Partial<Profile>) => {
    if (user) {
      const updated = { ...user, ...updates };
      setUser(updated);
    }
  };

  const saveProfile = async (
    profile: Partial<Profile> & { email: string; fullName: string; dateOfBirth: string; gender: Profile["gender"] }
  ): Promise<{ error?: string }> => {
    if (!authUser) return { error: "Not logged in" };
    const { data: saved, error } = await upsertProfile(authUser.id, profile);
    if (error) return { error };
    if (saved) {
      setUser(saved);
      setProfileComplete(!!saved.fullName && !!saved.dateOfBirth);
    }
    return {};
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authUser,
        isLoggedIn,
        profileComplete,
        loading,
        sendOtp,
        sendPhoneOtp,
        verifyOtp,
        verifyPhoneOtp,
        signInWithPhonePassword,
        logout,
        refreshProfile,
        updateProfile,
        setProfileComplete,
        saveProfile,
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
