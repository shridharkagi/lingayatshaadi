"use client";

import { useEffectivePlans } from "@/hooks/useEffectivePlans";
import { useAppConfig } from "@/contexts/AppConfigContext";
import { Button } from "@/components/ui/Button";
import { Check } from "lucide-react";

export default function MembershipPage() {
  const { config } = useAppConfig();
  const effectivePlans = useEffectivePlans();
  const enabledPlanIds = config.enabledPlanIds ?? ["p0", "p1", "p2", "p3"];
  const enabledPlans = effectivePlans.filter((p) => enabledPlanIds.includes(p.id));

  const handleFreePlanActivate = () => {
    // MVP: No payment - just show success. Can extend to update user's plan in AuthContext later.
    alert("Free plan activated! You can now use basic features.");
  };

  return (
    <div className="max-w-lg mx-auto pb-6">
      <header className="bg-[var(--primary)] text-white px-4 py-8 text-center rounded-b-3xl">
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
        {enabledPlans.length === 0 ? (
          <div className="rounded-2xl p-6 shadow-sm border-2 border-[var(--border)] bg-white text-center text-gray-500">
            No plans available at the moment. Please check back later.
          </div>
        ) : (
          enabledPlans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl p-6 shadow-sm border-2 ${
                plan.popular ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-[var(--border)] bg-white"
              }`}
            >
              {plan.popular && (
                <span className="inline-block px-3 py-0.5 bg-[var(--primary)] text-white text-xs font-medium rounded-full mb-3">
                  Most Popular
                </span>
              )}
              {plan.isFree && (
                <span className="inline-block px-3 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full mb-3 ml-2">
                  Free
                </span>
              )}
              <h4 className="text-xl font-bold text-[var(--foreground)]">{plan.name}</h4>
              <p className="text-2xl font-bold text-[var(--primary)] mt-1">
                {plan.price === 0 ? "Free" : `₹${plan.price}`}
                <span className="text-sm font-normal text-gray-500">/{plan.duration} month{plan.duration > 1 ? "s" : ""}</span>
              </p>
              <ul className="mt-4 space-y-2">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <Check size={16} className="text-[var(--success)] flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              {plan.isFree ? (
                <Button fullWidth className="mt-6" onClick={handleFreePlanActivate}>
                  Get Started
                </Button>
              ) : (
                <Button fullWidth className="mt-6">
                  Upgrade Now
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
