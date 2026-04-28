"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Profile } from "@/types";
import { createSupabaseClientSafe } from "@/lib/supabase";
import { fromProfileRow } from "@/lib/profileMapper";
import { upsertProfile } from "@/lib/api/profiles";
import {
  normalizeIndianPhone,
  syntheticEmailForPhone,
  syntheticEmailCandidatesForPhone,
} from "@/lib/phoneAuth";
import {
  CAPTCHA_BLOCKED_MESSAGE,
  friendlyEmailChangeError,
  isAuthEmailRateLimitedMessage,
  isCaptchaErrorMessage,
} from "@/lib/authUserFacingErrors";
import { withTimeout } from "@/lib/withTimeout";
import { useTurnstile } from "@/components/turnstile/TurnstileProvider";
import type { User } from "@supabase/supabase-js";

const GET_SESSION_TIMEOUT_MS = 20_000;
const SIGN_IN_TIMEOUT_MS = 30_000;
const SET_SESSION_PER_ATTEMPT_MS = 12_000;
const PHONE_AUTH_FETCH_MS = 28_000;

/** Account-holder basic details captured at signup and stored in auth user_metadata. */
export interface AccountMeta {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  gender?: "male" | "female";
  city?: string;
  /** ISO yyyy-mm-dd */
  dateOfBirth?: string;
  birthYear?: number;
  phone?: string;
}

/** Optional signup metadata sent to /api/auth/phone/verify (snake_case for the wire). */
export interface VerifyOtpMeta {
  first_name?: string;
  last_name?: string;
  full_name?: string;
  gender?: "male" | "female";
  city?: string;
  date_of_birth?: string;
  birth_year?: number;
}

interface AuthContextType {
  /** First full matrimonial profile for this auth user (back-compat). */
  user: Profile | null;
  authUser: User | null;
  /** Account holder basic details (from auth user_metadata + auth.user.phone). */
  accountMeta: AccountMeta | null;
  isLoggedIn: boolean;
  /** True when at least one full profile has been saved for this account. */
  profileComplete: boolean;
  loading: boolean;
  sendOtp: (email: string) => Promise<{ error?: string }>;
  sendPhoneOtp: (
    phone: string,
    purpose?: "login" | "signup" | "password_reset"
  ) => Promise<{ error?: string; cooldownSeconds?: number; retryAfter?: number }>;
  verifyOtp: (email: string, token: string) => Promise<{ error?: string }>;
  /** Optional password (signup) and meta (signup). Omit both for OTP login. */
  verifyPhoneOtp: (
    phone: string,
    token: string,
    password?: string,
    meta?: VerifyOtpMeta
  ) => Promise<{ error?: string }>;
  signInWithPhonePassword: (phone: string, password: string) => Promise<{ error?: string }>;
  /** 10-digit mobile or verified email + password. */
  signInWithPassword: (identifier: string, password: string) => Promise<{ error?: string }>;
  /** SMS OTP (purpose password_reset) + new password; returns session on success. */
  resetPasswordWithPhoneOtp: (
    phone: string,
    otp: string,
    newPassword: string
  ) => Promise<{ error?: string }>;
  /** Sends Supabase email change message to this address (optional account email). */
  requestEmailChange: (email: string) => Promise<{ error?: string; rateLimited?: boolean }>;
  /** Enter 6-digit code from email (type email_change). */
  verifyEmailChangeOtp: (email: string, token: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (profile: Partial<Profile>) => void;
  setProfileComplete: (complete: boolean) => void;
  /** Save profile to Supabase (create or update). Returns error message if failed. */
  saveProfile: (
    profile: Partial<Profile> & { email: string; fullName: string; dateOfBirth: string; gender: Profile["gender"] }
  ) => Promise<{ error?: string }>;
  /** Update account holder basic details in auth user_metadata. */
  updateAccountMeta: (patch: Partial<AccountMeta>) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function deriveAccountMeta(u: User | null): AccountMeta | null {
  if (!u) return null;
  const meta = (u.user_metadata || {}) as Record<string, unknown>;
  const firstName = typeof meta.first_name === "string" ? meta.first_name : undefined;
  const lastName = typeof meta.last_name === "string" ? meta.last_name : undefined;
  const fullName =
    (typeof meta.full_name === "string" && meta.full_name) ||
    [firstName, lastName].filter(Boolean).join(" ") ||
    undefined;
  const gender =
    meta.gender === "male" || meta.gender === "female"
      ? (meta.gender as AccountMeta["gender"])
      : undefined;
  const city = typeof meta.city === "string" ? meta.city : undefined;
  const dateOfBirth =
    typeof meta.date_of_birth === "string" && /^\d{4}-\d{2}-\d{2}$/.test(meta.date_of_birth)
      ? meta.date_of_birth
      : undefined;
  const birthYear =
    typeof meta.birth_year === "number"
      ? meta.birth_year
      : typeof meta.birth_year === "string" && /^\d{4}$/.test(meta.birth_year)
      ? Number(meta.birth_year)
      : undefined;
  return {
    firstName,
    lastName,
    fullName,
    gender,
    city,
    dateOfBirth,
    birthYear,
    phone: u.phone || undefined,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [accountMeta, setAccountMeta] = useState<AccountMeta | null>(null);
  const [profileComplete, setProfileComplete] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseClientSafe();
  const { getToken: getTurnstileToken, prime: primeTurnstile } = useTurnstile();

  const fetchProfile = async (authUserId: string) => {
    if (!supabase) {
      setUser(null);
      setProfileComplete(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", authUserId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      // Treat "no rows" as a normal state — account holders may not have any
      // detailed profiles yet (e.g. fresh signup).
      if (error) {
        const code = (error as { code?: string }).code;
        if (code === "PGRST116") {
          setUser(null);
          setProfileComplete(false);
          return;
        }
        const msg =
          (error as { message?: string }).message ||
          (error as { details?: string }).details ||
          "Unknown error";
        const details = (error as { details?: string }).details;
        const hint = (error as { hint?: string }).hint;
        console.warn(
          "[AuthContext] fetchProfile failed:",
          msg,
          code ? `(code: ${code})` : "",
          details ? `details: ${details}` : "",
          hint ? `hint: ${hint}` : ""
        );
        setUser(null);
        setProfileComplete(false);
        return;
      }

      if (data) {
        setUser(fromProfileRow(data));
        setProfileComplete(!!data.full_name && !!data.date_of_birth);
      } else {
        setUser(null);
        setProfileComplete(false);
      }
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error
          ? JSON.stringify(error)
          : String(error);
      console.warn("[AuthContext] fetchProfile threw:", msg);
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
    if (!supabase) {
      setLoading(false);
      return;
    }

    withTimeout(supabase.auth.getSession(), GET_SESSION_TIMEOUT_MS, "getSession")
      .then(({ data: { session } }) => {
        if (session?.user) {
          setAuthUser(session.user);
          setAccountMeta(deriveAccountMeta(session.user));
          setIsLoggedIn(true);
          // Do not await: slow or stuck profile fetch must not block clearing `loading`
          // (same pattern as onAuthStateChange below).
          void fetchProfile(session.user.id);
        }
      })
      .catch(() => {
        setAuthUser(null);
        setAccountMeta(null);
        setUser(null);
        setIsLoggedIn(false);
        setProfileComplete(false);
      })
      .finally(() => {
        // Keep bootstrap deterministic: even if auth state callback is delayed,
        // pages depending on authLoading should not hang on a perpetual spinner.
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setAuthUser(session.user);
        setAccountMeta(deriveAccountMeta(session.user));
        setIsLoggedIn(true);
        // Keep callback non-blocking to avoid auth-lock contention.
        void fetchProfile(session.user.id);
      } else {
        setAuthUser(null);
        setAccountMeta(null);
        setUser(null);
        setIsLoggedIn(false);
        setProfileComplete(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Supabase Auth has its own built-in CAPTCHA (Dashboard → Authentication →
  // Bot and Abuse Protection) wired to the same Cloudflare Turnstile we use on
  // /api/auth/phone/send. Every challenge endpoint (signInWithPassword,
  // signInWithOtp, verifyOtp, etc.) therefore requires `options.captchaToken`.
  // Tokens are single-use and ~5 min lifetime, so we always fetch a fresh one
  // right before the call.
  //
  // Two failure modes to distinguish:
  //   - Turnstile not configured at all (e.g. local dev without keys) → token
  //     is "" and `blocked` is false. Server-side captcha verification will
  //     decide what to do.
  //   - Turnstile configured but token acquisition threw (timeout, widget
  //     error). This almost always means the user is behind a corporate
  //     proxy / VPN or aggressive ad-blocker that's interfering with
  //     challenges.cloudflare.com. We surface CAPTCHA_BLOCKED_MESSAGE rather
  //     than letting Supabase return its cryptic "captcha verification
  //     process failed".
  const acquireCaptchaToken = async (): Promise<{
    token: string;
    blocked: boolean;
  }> => {
    try {
      const token = await getTurnstileToken();
      return { token, blocked: false };
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      console.warn("[auth] captcha token unavailable:", reason);
      return { token: "", blocked: true };
    }
  };

  /** If the Supabase error mentions captcha/turnstile, swap in our actionable copy. */
  const friendlyAuthError = (raw: string | undefined, fallback: string): string => {
    if (!raw) return fallback;
    if (isCaptchaErrorMessage(raw)) return CAPTCHA_BLOCKED_MESSAGE;
    return raw;
  };

  const sendOtp = async (email: string) => {
    if (!supabase) {
      return { error: "Supabase is not configured" };
    }
    try {
      const cap = await acquireCaptchaToken();
      if (cap.blocked) return { error: CAPTCHA_BLOCKED_MESSAGE };
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          captchaToken: cap.token,
        },
      });

      if (error) return { error: friendlyAuthError(error.message, "Failed to send OTP") };
      return {};
    } catch {
      return { error: "Failed to send OTP" };
    }
  };

  const verifyOtp = async (email: string, token: string) => {
    if (!supabase) {
      return { error: "Supabase is not configured" };
    }
    try {
      const cap = await acquireCaptchaToken();
      if (cap.blocked) return { error: CAPTCHA_BLOCKED_MESSAGE };
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
        options: { captchaToken: cap.token },
      });

      if (error) return { error: friendlyAuthError(error.message, "Failed to verify OTP") };
      return {};
    } catch {
      return { error: "Failed to verify OTP" };
    }
  };

  const sendPhoneOtp = async (
    phone: string,
    purpose: "login" | "signup" | "password_reset" = "login"
  ) => {
    // Acquire a fresh Turnstile token right before the request. Tokens cannot
    // be reused (Cloudflare enforces) and have a ~5 minute lifetime, so doing
    // this at submit time avoids the trap of an expired token if the user
    // sat on the form.
    //
    // If acquisition fails outright (corporate proxy / VPN / ad-blocker
    // intercepting challenges.cloudflare.com), short-circuit with the friendly
    // captcha-blocked message instead of sending an empty token and watching
    // the server bounce it.
    const cap = await acquireCaptchaToken();
    if (cap.blocked) return { error: CAPTCHA_BLOCKED_MESSAGE };

    const controller = new AbortController();
    const abortTimer = window.setTimeout(() => controller.abort(), PHONE_AUTH_FETCH_MS);
    try {
      const res = await fetch("/api/auth/phone/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, purpose, turnstileToken: cap.token }),
        signal: controller.signal,
      });
      const data = (await res.json()) as {
        error?: string;
        cooldown_seconds?: number;
        retry_after?: number;
        captcha?: string;
      };
      if (!res.ok) {
        // Server flagged the request as captcha-failed (enforce mode) — give
        // the user actionable copy rather than the generic server message.
        if (res.status === 403 && data.captcha === "failed") {
          return { error: CAPTCHA_BLOCKED_MESSAGE };
        }
        return {
          error: data.error || "Failed to send SMS OTP",
          retryAfter: data.retry_after,
        };
      }
      return { cooldownSeconds: data.cooldown_seconds };
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        return { error: "Request timed out. Check your connection and try again." };
      }
      return { error: "Failed to send SMS OTP" };
    } finally {
      window.clearTimeout(abortTimer);
    }
  };

  const signInWithPhonePassword = async (phone: string, password: string) => {
    if (!supabase) {
      return { error: "Supabase is not configured" };
    }
    const parsed = normalizeIndianPhone(phone);
    if (!parsed) return { error: "Enter a valid 10-digit mobile number" };
    try {
      // Attempt order is tuned for latency (each attempt = fresh captcha +
      // Supabase round-trip, ~500-700ms):
      //   1. current synthetic email — matches all accounts created after the
      //      domain-format fix (the vast majority).
      //   2. phone (E.164) — covers legacy accounts whose phone column is
      //      populated. This is the more common legacy case.
      //   3. legacy synthetic email — catches the rare accounts where neither
      //      the current email format nor the phone column matches.
      const [emailCurrent, emailLegacy] = syntheticEmailCandidatesForPhone(parsed.digits10);
      const attempts: Array<{
        kind: "email_current" | "phone" | "email_legacy";
        run: (captchaToken: string) =>
          ReturnType<NonNullable<typeof supabase>["auth"]["signInWithPassword"]>;
      }> = [
        {
          kind: "email_current",
          run: (captchaToken) =>
            supabase.auth.signInWithPassword({
              email: emailCurrent,
              password,
              options: { captchaToken },
            }),
        },
        {
          kind: "phone",
          run: (captchaToken) =>
            supabase.auth.signInWithPassword({
              phone: parsed.e164,
              password,
              options: { captchaToken },
            }),
        },
        {
          kind: "email_legacy",
          run: (captchaToken) =>
            supabase.auth.signInWithPassword({
              email: emailLegacy,
              password,
              options: { captchaToken },
            }),
        },
      ];

      let error: { message?: string } | null = null;
      for (const attempt of attempts) {
        const cap = await acquireCaptchaToken();
        if (cap.blocked) return { error: CAPTCHA_BLOCKED_MESSAGE };
        const result = await withTimeout(
          attempt.run(cap.token),
          SIGN_IN_TIMEOUT_MS,
          "Sign in"
        );
        if (!result.error) {
          error = null;
          break;
        }
        error = result.error;
      }
      if (error) {
        return {
          error: friendlyAuthError(error.message, "Invalid mobile number or password"),
        };
      }
      return {};
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("timed out")) {
        return { error: "Sign in timed out. Check your connection and try again." };
      }
      return { error: `Sign in failed: ${msg}` };
    }
  };

  const signInWithPassword = async (identifier: string, password: string) => {
    if (!supabase) {
      return { error: "Supabase is not configured" };
    }
    const id = identifier.trim();
    if (!id) return { error: "Enter mobile number" };
    if (id.includes("@")) {
      try {
        const cap = await acquireCaptchaToken();
        if (cap.blocked) return { error: CAPTCHA_BLOCKED_MESSAGE };
        const { error } = await withTimeout(
          supabase.auth.signInWithPassword({
            email: id.toLowerCase(),
            password,
            options: { captchaToken: cap.token },
          }),
          SIGN_IN_TIMEOUT_MS,
          "Sign in"
        );
        if (error) {
          return {
            error: friendlyAuthError(error.message, "Invalid email or password"),
          };
        }
        return {};
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("timed out")) {
          return { error: "Sign in timed out. Check your connection and try again." };
        }
        return { error: `Sign in failed: ${msg}` };
      }
    }
    return signInWithPhonePassword(id, password);
  };

  const establishSessionFromTokens = async (
    access_token: string,
    refresh_token: string
  ): Promise<{ error?: string }> => {
    if (!supabase) {
      return { error: "Supabase is not configured" };
    }
    const lockErrorPattern = /lock:ls\.auth\.token|another request stole it/i;
    let lastSessionError: string | null = null;
    const setSessionWithTimeout = async <T,>(promise: Promise<T>, ms: number): Promise<T> => {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error("Session setup timed out")), ms)
        ),
      ]);
    };

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const { error } = await setSessionWithTimeout(
          supabase.auth.setSession({
            access_token,
            refresh_token,
          }),
          SET_SESSION_PER_ATTEMPT_MS
        );
        if (!error) {
          lastSessionError = null;
          break;
        }
        lastSessionError = error.message || "Unknown session error";
        if (!lockErrorPattern.test(lastSessionError)) {
          return { error: `Session error: ${lastSessionError}` };
        }
      } catch (sessionErr) {
        lastSessionError = sessionErr instanceof Error ? sessionErr.message : String(sessionErr);
        if (!lockErrorPattern.test(lastSessionError)) {
          return { error: `Could not establish session: ${lastSessionError}` };
        }
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 120));
    }

    if (lastSessionError) {
      try {
        const { data: sessionData, error: sessionReadError } = await withTimeout(
          supabase.auth.getSession(),
          GET_SESSION_TIMEOUT_MS,
          "getSession"
        );
        if (sessionReadError || !sessionData.session?.access_token) {
          return { error: `Could not establish session: ${lastSessionError}` };
        }
      } catch {
        return { error: `Could not establish session: ${lastSessionError}` };
      }
    }
    return {};
  };

  const resetPasswordWithPhoneOtp = async (phone: string, otp: string, newPassword: string) => {
    if (!supabase) {
      return { error: "Supabase is not configured" };
    }
    const controller = new AbortController();
    const abortTimer = window.setTimeout(() => controller.abort(), PHONE_AUTH_FETCH_MS);
    try {
      const res = await fetch("/api/auth/phone/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp, new_password: newPassword }),
        signal: controller.signal,
      });
      let data: { error?: string; access_token?: string; refresh_token?: string } = {};
      try {
        data = await res.json();
      } catch {
        return { error: `Server returned ${res.status} with non-JSON response` };
      }
      if (!res.ok) {
        return { error: data.error || `Reset failed (HTTP ${res.status})` };
      }
      if (!data.access_token || !data.refresh_token) {
        return { error: "Invalid response from server (missing tokens)" };
      }
      return await establishSessionFromTokens(data.access_token, data.refresh_token);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (e instanceof Error && e.name === "AbortError") {
        return { error: "Request timed out. Check your connection and try again." };
      }
      return { error: `Reset failed: ${msg}` };
    } finally {
      window.clearTimeout(abortTimer);
    }
  };

  const requestEmailChange = async (email: string) => {
    if (!supabase) {
      return { error: "Supabase is not configured" };
    }
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return { error: "Enter a valid email address" };
    }
    try {
      const { data, error } = await supabase.auth.updateUser({ email: trimmed });
      if (error) {
        return {
          error: friendlyEmailChangeError(error.message),
          rateLimited: isAuthEmailRateLimitedMessage(error.message),
        };
      }
      if (data.user) {
        setAuthUser(data.user);
        setAccountMeta(deriveAccountMeta(data.user));
      }
      return {};
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        error: friendlyEmailChangeError(msg),
        rateLimited: isAuthEmailRateLimitedMessage(msg),
      };
    }
  };

  const verifyEmailChangeOtp = async (email: string, token: string) => {
    if (!supabase) {
      return { error: "Supabase is not configured" };
    }
    const clean = token.replace(/\D/g, "");
    if (clean.length !== 6) return { error: "Enter the 6-digit code from your email" };
    try {
      const cap = await acquireCaptchaToken();
      if (cap.blocked) return { error: CAPTCHA_BLOCKED_MESSAGE };
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: clean,
        type: "email_change",
        options: { captchaToken: cap.token },
      });
      if (error) return { error: friendlyAuthError(error.message, "Verification failed") };
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) return { error: userErr.message };
      if (userData.user) {
        setAuthUser(userData.user);
        setAccountMeta(deriveAccountMeta(userData.user));
      }
      return {};
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { error: msg };
    }
  };

  const verifyPhoneOtp = async (
    phone: string,
    token: string,
    password?: string,
    meta?: VerifyOtpMeta
  ) => {
    if (!supabase) {
      return { error: "Supabase is not configured" };
    }
    const controller = new AbortController();
    const abortTimer = window.setTimeout(() => controller.abort(), PHONE_AUTH_FETCH_MS);
    try {
      const payload: Record<string, unknown> = { phone, otp: token };
      if (password) payload.password = password;
      if (meta && Object.keys(meta).length > 0) payload.meta = meta;
      const res = await fetch("/api/auth/phone/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      let data: {
        error?: string;
        access_token?: string;
        refresh_token?: string;
      } = {};
      try {
        data = await res.json();
      } catch {
        return { error: `Server returned ${res.status} with non-JSON response` };
      }
      if (!res.ok) {
        return { error: data.error || `Failed to verify OTP (HTTP ${res.status})` };
      }
      if (!data.access_token || !data.refresh_token) {
        return { error: "Invalid response from server (missing tokens)" };
      }
      return await establishSessionFromTokens(data.access_token, data.refresh_token);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (e instanceof Error && e.name === "AbortError") {
        return { error: "Verification timed out. Check your connection and try again." };
      }
      return { error: `Failed to verify OTP: ${msg}` };
    } finally {
      window.clearTimeout(abortTimer);
    }
  };

  const logout = async () => {
    if (!supabase) {
      setUser(null);
      setAuthUser(null);
      setAccountMeta(null);
      setIsLoggedIn(false);
      setProfileComplete(false);
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
    setAuthUser(null);
    setAccountMeta(null);
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

  const updateAccountMeta = async (patch: Partial<AccountMeta>): Promise<{ error?: string }> => {
    if (!supabase) return { error: "Supabase is not configured" };
    const data: Record<string, unknown> = {};
    if (patch.firstName !== undefined) data.first_name = patch.firstName;
    if (patch.lastName !== undefined) data.last_name = patch.lastName;
    if (patch.fullName !== undefined) data.full_name = patch.fullName;
    else if (patch.firstName !== undefined || patch.lastName !== undefined) {
      const fn = patch.firstName ?? accountMeta?.firstName ?? "";
      const ln = patch.lastName ?? accountMeta?.lastName ?? "";
      const full = [fn, ln].filter(Boolean).join(" ").trim();
      if (full) data.full_name = full;
    }
    if (patch.gender !== undefined) data.gender = patch.gender;
    if (patch.city !== undefined) data.city = patch.city;
    if (patch.dateOfBirth !== undefined) data.date_of_birth = patch.dateOfBirth;
    if (patch.birthYear !== undefined) data.birth_year = patch.birthYear;
    try {
      const { data: res, error } = await supabase.auth.updateUser({ data });
      if (error) return { error: error.message };
      if (res.user) {
        setAuthUser(res.user);
        setAccountMeta(deriveAccountMeta(res.user));
      }
      return {};
    } catch {
      return { error: "Failed to update account" };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authUser,
        accountMeta,
        isLoggedIn,
        profileComplete,
        loading,
        sendOtp,
        sendPhoneOtp,
        verifyOtp,
        verifyPhoneOtp,
        signInWithPhonePassword,
        signInWithPassword,
        resetPasswordWithPhoneOtp,
        requestEmailChange,
        verifyEmailChangeOtp,
        logout,
        refreshProfile,
        updateProfile,
        setProfileComplete,
        saveProfile,
        updateAccountMeta,
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
