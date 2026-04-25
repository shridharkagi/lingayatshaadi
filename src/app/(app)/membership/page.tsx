"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Check } from "lucide-react";
import { adminFetch } from "@/lib/api/adminClient";
import { useAppConfig } from "@/contexts/AppConfigContext";
import { useAuth } from "@/contexts/AuthContext";

type Plan = {
  id: string;
  code: string;
  name: string;
  duration_days: number;
  price: number;
  currency: string;
  features: string[];
  total_contact_views: number;
  daily_contact_view_limit: number;
  is_active: boolean;
};

export default function MembershipPage() {
  const { config } = useAppConfig();
  const { accountMeta, authUser } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);
  const [requestWhatsAppUrl, setRequestWhatsAppUrl] = useState<string | null>(null);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [callbackNumber, setCallbackNumber] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const supportNumber = (config.callContactNumber || "6360130905").replace(/\D/g, "");

  useEffect(() => {
    const load = async () => {
      setError(null);
      const res = await adminFetch("/api/subscriptions/plans");
      const json = (await res.json()) as { plans?: Plan[]; error?: string };
      if (!res.ok) {
        setError(json.error || "Failed to load plans");
        return;
      }
      const loadedPlans = json.plans || [];
      setPlans(loadedPlans);
      const firstPaid = loadedPlans.find((p) => Number(p.price || 0) > 0);
      const firstAny = loadedPlans[0];
      setSelectedPlanId((firstPaid || firstAny)?.id || "");
    };
    void load();
  }, []);

  useEffect(() => {
    const defaultPhone = accountMeta?.phone || "";
    if (!callbackNumber && defaultPhone) setCallbackNumber(defaultPhone);
  }, [accountMeta?.phone, callbackNumber]);

  const enabledPlans = useMemo(() => plans.filter((p) => p.is_active), [plans]);

  const handleFreePlanActivate = () => {
    alert("Please contact support to activate your Free plan for the first time.");
  };

  const handleUpgradeContact = (plan: Plan) => {
    const msg = `Hi, I want to upgrade to ${plan.name} (₹${plan.price}) plan. Please assist with manual payment and activation.`;
    const whatsapp = config.whatsappContactNumber?.replace(/\D/g, "");
    if (whatsapp) {
      window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
      return;
    }
    window.open(`tel:${supportNumber}`, "_self");
  };

  const submitUpgradeRequest = async () => {
    setError(null);
    setRequestSuccess(null);
    setRequestWhatsAppUrl(null);
    if (!selectedPlanId) {
      setError("Please select a plan for upgrade request.");
      return;
    }
    if (!callbackNumber.trim()) {
      setError("Please enter callback number.");
      return;
    }
    setSubmittingRequest(true);
    const res = await adminFetch("/api/subscriptions/upgrade-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planId: selectedPlanId,
        callbackNumber: callbackNumber.trim(),
        note: requestNote.trim() || undefined,
      }),
    });
    const json = (await res.json()) as { error?: string; whatsappPrefillUrl?: string };
    setSubmittingRequest(false);
    if (!res.ok) {
      setError(json.error || "Failed to submit request");
      return;
    }
    setRequestSuccess("Upgrade request submitted. Support will contact you soon.");
    setRequestWhatsAppUrl(json.whatsappPrefillUrl || null);
    setRequestNote("");
  };

  return (
    <div className="max-w-lg mx-auto pb-6">
      <header className="bg-[var(--primary)] text-white px-4 py-8 text-center rounded-b-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/90 mb-2">LingayatShaadi</p>
        <h1 className="text-2xl font-bold">Upgrade to Premium</h1>
        <p className="text-white/90 mt-2">Unlock more features and find your perfect match faster</p>
      </header>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-[var(--foreground)] mb-3">Trust Badge</h3>
          <p className="text-gray-600 text-sm mb-4">
            Get verified and boost your profile visibility. Verified members get 3x more profile views.
          </p>
          <div className="flex gap-2">
            <div className="flex-1 p-3 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/20">
              <p className="text-sm font-medium">Verify ID</p>
              <p className="text-xs text-gray-500">Complete profile verification</p>
            </div>
            <div className="flex-1 p-3 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/20">
              <p className="text-sm font-medium">Trust Score</p>
              <p className="text-xs text-gray-500">Build your credibility</p>
            </div>
          </div>
        </div>

        <h3 className="font-semibold text-[var(--foreground)]">Choose a Plan</h3>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {enabledPlans.length === 0 ? (
          <div className="rounded-2xl p-6 shadow-sm border-2 border-[var(--border)] bg-white text-center text-gray-500">
            No plans available at the moment. Please check back later.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 items-stretch">
            {enabledPlans.map((plan) => (
              <div
                key={plan.id}
                className="rounded-2xl p-4 shadow-sm border-2 border-[var(--border)] bg-white h-full flex flex-col"
              >
                {Number(plan.price || 0) === 0 && (
                  <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-semibold rounded-full mb-2">
                    Free
                  </span>
                )}
                <h4 className="text-base font-bold text-[var(--foreground)] leading-tight">{plan.name}</h4>
                <p className="text-lg font-bold text-[var(--primary)] mt-1 leading-tight">
                  {Number(plan.price || 0) === 0 ? "Free" : `₹${Number(plan.price || 0)}`}
                </p>
                <p className="text-[11px] text-gray-500">
                  {Math.round(Number(plan.duration_days || 30) / 30)} month(s)
                </p>
                <p className="text-[11px] text-gray-500 mt-1">
                  {Number(plan.total_contact_views || 0)} total, {Number(plan.daily_contact_view_limit || 0)}/day
                </p>
                <ul className="mt-2 space-y-1">
                  {(plan.features || []).slice(0, 2).map((f, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px] text-gray-600 leading-snug">
                      <Check size={12} className="text-[var(--success)] flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-3">
                  {Number(plan.price || 0) === 0 ? (
                    <Button fullWidth className="!py-2 text-sm" onClick={handleFreePlanActivate}>
                      Get Started
                    </Button>
                  ) : (
                    <Button fullWidth className="!py-2 text-sm" onClick={() => handleUpgradeContact(plan)}>
                      Upgrade
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="rounded-xl border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-3 text-xs text-gray-700">
          Need upgrade help? Contact support at <span className="font-semibold">{config.callContactNumber || "6360130905"}</span>.
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <h4 className="font-semibold text-[var(--foreground)]">Request Upgrade</h4>
          <p className="text-xs text-gray-500 mt-1">
            We will notify admin email and support WhatsApp. Your account user is attached automatically.
          </p>
          {!authUser && (
            <p className="text-xs text-amber-700 mt-2">Login is required to raise upgrade request.</p>
          )}
          {requestSuccess && <p className="text-xs text-green-700 mt-2">{requestSuccess}</p>}
          {requestWhatsAppUrl && (
            <a
              href={requestWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white"
            >
              Open WhatsApp with Prefilled Request
            </a>
          )}
          <div className="mt-3 grid grid-cols-1 gap-2">
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">Select plan</option>
              {enabledPlans
                .filter((p) => Number(p.price || 0) > 0)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} - ₹{Number(p.price || 0)}
                  </option>
                ))}
            </select>
            <input
              value={callbackNumber}
              onChange={(e) => setCallbackNumber(e.target.value)}
              placeholder="Preferred callback number"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <textarea
              value={requestNote}
              onChange={(e) => setRequestNote(e.target.value)}
              placeholder="Optional note (best time to call, payment mode preference, etc.)"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm min-h-[84px]"
            />
            <Button
              fullWidth
              onClick={submitUpgradeRequest}
              disabled={!authUser || submittingRequest}
            >
              {submittingRequest ? "Submitting..." : "Submit Upgrade Request"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
