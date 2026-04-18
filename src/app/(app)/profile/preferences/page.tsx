"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { PartnerPreference, Profile } from "@/types";
import { PartnerPreferencesForm } from "@/components/PartnerPreferencesForm";
import { updateProfileById } from "@/lib/api/profiles";

export default function MatchPreferencesPage() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();

  const initial = useMemo<PartnerPreference>(
    () => user?.partnerPreference || {},
    [user?.partnerPreference]
  );

  // Local draft so users can tweak many fields before saving.
  const [draft, setDraft] = useState<PartnerPreference>(initial);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState("");

  // Re-sync draft when user/profile loads (or switches).
  useEffect(() => {
    setDraft(initial);
  }, [initial]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  const handleSave = async () => {
    if (!user?.id) {
      setError("Create your profile first to save preferences.");
      return;
    }
    setError("");
    setSaving(true);
    let saveErr: string | null = null;
    let saved: Profile | null = null;
    try {
      const res = await updateProfileById(user.id, {
        partnerPreference: draft,
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
    if (saved) {
      // Sync the in-memory profile so other screens see the change instantly.
      updateProfile({ partnerPreference: saved.partnerPreference });
    }
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  };

  return (
    <div className="max-w-3xl mx-auto pb-32">
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

      {/* Sticky save bar (mobile-first; also visible on desktop) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t border-[var(--border)] px-4 py-3 sm:py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex-1 sm:flex-none sm:px-8"
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
            className="flex-1 sm:flex-none sm:px-8"
            disabled={saving || !dirty}
          >
            {saving ? "Saving..." : dirty ? "Save Preferences" : "Saved"}
          </Button>
        </div>
      </div>
    </div>
  );
}
