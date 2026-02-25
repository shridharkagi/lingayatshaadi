"use client";

import { mockMembershipPlans } from "@/data/mock";
import { Button } from "@/components/ui/Button";
import { Check } from "lucide-react";

export default function MembershipPage() {
  return (
    <div className="max-w-lg mx-auto">
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
        {mockMembershipPlans.map((plan) => (
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
            <h4 className="text-xl font-bold text-[var(--foreground)]">{plan.name}</h4>
            <p className="text-2xl font-bold text-[var(--primary)] mt-1">
              ₹{plan.price}
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
            <Button fullWidth className="mt-6">
              Upgrade Now
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
