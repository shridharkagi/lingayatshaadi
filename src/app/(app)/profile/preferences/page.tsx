"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useProfiles } from "@/contexts/ProfilesContext";
import { PartnerPreference, Profile } from "@/types";
import { PartnerPreferencesForm } from "@/components/PartnerPreferencesForm";
import { updateProfileById } from "@/lib/api/profiles";
import {
  hasMeaningfulPreferences,
  suggestPartnerPreference,
} from "@/lib/partnerPreferenceDefaults";

const BANNER_DISMISS_KEY_PREFIX = "ls:partnerPrefsBannerDismissed:";

export default function MatchPreferencesPage() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();
  // We also need to keep the in-memory profiles cache (used by the public
  // /profile/[id] page) in sync, otherwise the visibility toggle / saved
  // preferences won't show up there until a hard refresh.
  const { updateProfileById: updateProfileInList } = useProfiles();

  /**
   * If the user has never explicitly saved their preferences (or the saved
   * object is structurally empty) we seed the form with smart defaults
   * derived from their own profile. Otherwise we hand the existing object
   * through unchanged so we don't clobber any prior intent.
   */
  const { initial, wasSeededFromDefaults } = useMemo<{
    initial: PartnerPreference;
    wasSeededFromDefaults: boolean;
  }>(() => {
    if (!user) return { initial: {}, wasSeededFromDefaults: false };
    const meaningful = hasMeaningfulPreferences({
      partnerPreference: user.partnerPreference,
      preferencesUpdatedAt: user.preferencesUpdatedAt,
    });
    if (meaningful) {
      return { initial: user.partnerPreference || {}, wasSeededFromDefaults: false };
    }
    return { initial: suggestPartnerPreference(user as Profile), wasSeededFromDefaults: true };
  }, [user]);

  const [draft, setDraft] = useState<PartnerPreference>(initial);
  const [showOnProfile, setShowOnProfile] = useState<boolean>(
    user?.showPartnerPreferences ?? true
  );
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState("");

  // Re-sync draft when user/profile loads (or switches).
  useEffect(() => {
    setDraft(initial);
  }, [initial]);

  // Re-sync visibility when the underlying profile changes (e.g. after save
  // refresh, or when switching managed profiles).
  useEffect(() => {
    if (user) setShowOnProfile(user.showPartnerPreferences ?? true);
  }, [user?.id, user?.showPartnerPreferences]);

  // Hydrate the "banner already dismissed" flag from localStorage so the
  // suggestion banner stays gone across reloads. Per-user-id keying so
  // multiple managed profiles each get their own state.
  useEffect(() => {
    if (!user?.id) return;
    try {
      const raw = window.localStorage.getItem(BANNER_DISMISS_KEY_PREFIX + user.id);
      setBannerDismissed(raw === "1");
    } catch {
      // localStorage may be unavailable (private mode, SSR) — fail open.
    }
  }, [user?.id]);

  const dismissBanner = () => {
    setBannerDismissed(true);
    if (user?.id) {
      try {
        window.localStorage.setItem(BANNER_DISMISS_KEY_PREFIX + user.id, "1");
      } catch {
        /* noop */
      }
    }
  };

  const dirty =
    JSON.stringify(draft) !== JSON.stringify(initial) ||
    showOnProfile !== (user?.showPartnerPreferences ?? true);

  const handleResetToSuggested = () => {
    if (!user) return;
    setDraft(suggestPartnerPreference(user as Profile));
  };

  const handleSave = async () => {
    if (!user?.id) {
      setError("Create your profile first to save preferences.");
      return;
    }
    setError("");
    setSaving(true);
    const nowIso = new Date().toISOString();
    let saveErr: string | null = null;
    let saved: Profile | null = null;
    try {
      const res = await updateProfileById(user.id, {
        partnerPreference: draft,
        showPartnerPreferences: showOnProfile,
        preferencesUpdatedAt: nowIso,
      });
      saveErr = res.error;
      saved = res.data;
    } catch (err) {
      saveErr =
        err instanceof Error ? err.message : "Failed to save preferences";
    } finally {
      setSaving(false);
    }

    if (saveErr) {
      setError(saveErr);
      return;
    }
    const patch = saved
      ? {
          partnerPreference: saved.partnerPreference,
          showPartnerPreferences: saved.showPartnerPreferences,
          preferencesUpdatedAt: saved.preferencesUpdatedAt ?? nowIso,
        }
      : {
          partnerPreference: draft,
          showPartnerPreferences: showOnProfile,
          preferencesUpdatedAt: nowIso,
        };

    // Sync both contexts so any open screen (own profile, public profile
    // detail page, account list) reflects the change without a hard refresh.
    updateProfile(patch);
    updateProfileInList(user.id, patch);

    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  };

  return (
    // pb on mobile must clear BOTH the sticky save bar (~60px) and the
    // BottomNav (h-16 = 64px) plus iOS safe area; on lg+ the BottomNav is
    // hidden so we only need clearance for the save bar itself.
    <div className="max-w-3xl mx-auto pb-44 lg:pb-32">
      <header className="bg-white border-b border-[var(--border)] px-4 py-3 flex items-center gap-3 sticky top-0 z-20">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-lg hover:bg-gray-100"
          aria-label="Back"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base sm:text-lg font-semibold leading-tight">
            Match Preferences
          </h1>
          <p className="text-[11px] text-gray-500">
            Tell us what you&apos;re looking for — this helps us match better.
          </p>
        </div>
        {dirty && (
          <Button
            onClick={handleSave}
            size="sm"
            className="hidden sm:inline-flex"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        )}
      </header>

      <div className="p-4 sm:p-5">
        <PartnerPreferencesForm
          value={draft}
          onChange={(next) => setDraft(next)}
          showOnProfile={showOnProfile}
          onShowOnProfileChange={setShowOnProfile}
          showSmartDefaultsBanner={wasSeededFromDefaults && !bannerDismissed}
          onDismissSmartDefaultsBanner={dismissBanner}
          onResetToSuggested={handleResetToSuggested}
        />

        {error && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {savedFlash && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
            <Check size={16} className="shrink-0 mt-0.5" />
            <span>Preferences saved.</span>
          </div>
        )}
      </div>

      {/*
        Sticky save bar.
        - On mobile/tablet (< lg): the global BottomNav is fixed at bottom-0
          with h-16 (4rem) + iOS safe-area, so we offset the save bar
          upward by 4rem so it visually rests directly on top of the nav
          instead of sliding behind it.
        - On lg+: BottomNav is hidden, so we anchor at bottom-0.
        - z-40 keeps the bar above page content but below the BottomNav (z-50)
          so the nav still wins for any tap targets at the very bottom edge.
      */}
      <div
        className="fixed left-0 right-0 bottom-16 lg:bottom-0 z-40 bg-white/95 backdrop-blur border-t border-[var(--border)] px-3 py-2 sm:px-4 sm:py-3 shadow-[0_-4px_12px_-6px_rgba(0,0,0,0.08)]"
        style={{
          paddingBottom:
            "max(env(safe-area-inset-bottom, 0px), 0.5rem)",
        }}
      >
        <div className="max-w-3xl mx-auto flex items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            onClick={() => router.back()}
            size="sm"
            className="flex-1 sm:flex-none sm:px-8 sm:h-10 whitespace-nowrap"
            disabled={saving}
          >
            Back
          </Button>
          <div className="hidden sm:block flex-1 text-center text-xs text-gray-500">
            {dirty
              ? "You have unsaved changes"
              : "All changes are saved"}
          </div>
          <Button
            onClick={handleSave}
            size="sm"
            className="flex-[2] sm:flex-none sm:px-8 sm:h-10 whitespace-nowrap"
            disabled={saving || !dirty}
          >
            {saving ? "Saving..." : dirty ? (
              <>
                <span className="sm:hidden">Save</span>
                <span className="hidden sm:inline">Save Preferences</span>
              </>
            ) : "Saved"}
          </Button>
        </div>
      </div>
    </div>
  );
}
