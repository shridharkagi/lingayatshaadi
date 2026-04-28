"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppConfig } from "@/contexts/AppConfigContext";
import { useTurnstile } from "@/components/turnstile/TurnstileProvider";
import {
  getWhatsAppLeadStatus,
  submitWhatsAppLead,
  trackWhatsAppLeadEvent,
  type WhatsAppLeadSourcePage,
} from "@/lib/api/whatsappLeads";
import { WhatsAppBrandIcon } from "@/components/icons/WhatsAppBrandIcon";

const LOCAL_JOINED_KEY = "wa_group_joined_v1";

export function WhatsAppGroupCta({ sourcePage }: { sourcePage: WhatsAppLeadSourcePage }) {
  const { isLoggedIn, accountMeta, user } = useAuth();
  const { config } = useAppConfig();
  const { getToken: getTurnstileToken, prime: primeTurnstile } = useTurnstile();

  const [statusLoading, setStatusLoading] = useState(true);
  const [shouldShow, setShouldShow] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [trackedImpression, setTrackedImpression] = useState(false);

  const [name, setName] = useState("");
  const [contactNo, setContactNo] = useState("");
  const [city, setCity] = useState("");

  const prefill = useMemo(
    () => ({
      name: (accountMeta?.fullName || user?.fullName || "").trim(),
      contactNo: (accountMeta?.phone || user?.contact || "").trim(),
      city: (accountMeta?.city || user?.city || "").trim(),
    }),
    [accountMeta?.city, accountMeta?.fullName, accountMeta?.phone, user?.city, user?.contact, user?.fullName]
  );

  useEffect(() => {
    if (!isLoggedIn) return;
    setName(prefill.name);
    setContactNo(prefill.contactNo);
    setCity(prefill.city);
  }, [isLoggedIn, prefill.city, prefill.contactNo, prefill.name]);

  useEffect(() => {
    let cancelled = false;
    const localJoined =
      typeof window !== "undefined" && localStorage.getItem(LOCAL_JOINED_KEY) === "1";
    if (localJoined) {
      setShouldShow(false);
      setStatusLoading(false);
      return;
    }
    void (async () => {
      const status = await getWhatsAppLeadStatus();
      if (cancelled) return;
      setShouldShow(status.shouldShowCta);
      setStatusLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (statusLoading || !shouldShow || trackedImpression) return;
    setTrackedImpression(true);
    void trackWhatsAppLeadEvent(sourcePage, "cta_impression");
  }, [sourcePage, shouldShow, statusLoading, trackedImpression]);

  if (statusLoading || !shouldShow) return null;

  const onOpenForm = () => {
    setModalOpen(true);
    setError("");
    if (!name && prefill.name) setName(prefill.name);
    if (!contactNo && prefill.contactNo) setContactNo(prefill.contactNo);
    if (!city && prefill.city) setCity(prefill.city);
    primeTurnstile();
    void trackWhatsAppLeadEvent(sourcePage, "form_opened");
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const turnstileToken = isLoggedIn ? "" : await getTurnstileToken();
      const res = await submitWhatsAppLead({
        name,
        contactNo,
        city,
        sourcePage,
        turnstileToken,
      });
      if (!res.ok) {
        setError(res.error || "Unable to submit. Please try again.");
        return;
      }

      if (typeof window !== "undefined") localStorage.setItem(LOCAL_JOINED_KEY, "1");
      setShouldShow(false);
      setModalOpen(false);
      void trackWhatsAppLeadEvent(sourcePage, "submit_success");

      if (config.whatsappGroupUrl?.trim()) {
        window.open(config.whatsappGroupUrl, "_blank", "noopener,noreferrer");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="md:hidden">
      <div className="rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366] text-white">
            <WhatsAppBrandIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--foreground)]">Join WhatsApp Group</p>
            <p className="mt-1 text-xs text-gray-600">
              To get regular updates on new profiles, please join our group.
            </p>
            <p className="mt-1 text-[11px] text-gray-500">No spam. Only matchmaking updates.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenForm}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95 active:scale-[0.99]"
        >
          <WhatsAppBrandIcon className="h-4 w-4" />
          Join WhatsApp Group
        </button>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-[70] bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="mx-auto mt-16 w-full max-w-sm rounded-2xl bg-white shadow-xl"
            onClick={(evt) => evt.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
              <p className="text-sm font-semibold text-[var(--foreground)]">Join WhatsApp Group</p>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
                aria-label="Close form"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={onSubmit} className="space-y-3 p-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Contact No</label>
                <input
                  value={contactNo}
                  onChange={(e) => setContactNo(e.target.value)}
                  required
                  inputMode="numeric"
                  className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">City</label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none"
                />
              </div>
              <p className="text-[11px] leading-snug text-gray-500">
                By continuing, you agree to receive profile update messages on WhatsApp.
              </p>
              {error && <p className="text-xs font-medium text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
              >
                {submitting ? "Submitting..." : "Continue to WhatsApp Group"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
