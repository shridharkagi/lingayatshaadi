"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { useEffectivePlans } from "@/hooks/useEffectivePlans";
import { useAppConfig } from "@/contexts/AppConfigContext";
import { PlanEditModal } from "@/components/PlanEditModal";
import type { MembershipPlan } from "@/types";

export default function SuperAdminSubscriptionsPage() {
  const { config, updateConfig } = useAppConfig();
  const effectivePlans = useEffectivePlans();
  const enabledPlanIds = config.enabledPlanIds ?? ["p0", "p1", "p2", "p3"];
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);

  const togglePlan = (planId: string) => {
    const isEnabled = enabledPlanIds.includes(planId);
    const next = isEnabled
      ? enabledPlanIds.filter((id) => id !== planId)
      : [...enabledPlanIds, planId];
    updateConfig({ enabledPlanIds: next });
  };

  const handleSaveOverride = (planId: string, override: Partial<MembershipPlan> | null) => {
    const overrides = { ...(config.planOverrides ?? {}) };
    if (override === null) {
      delete overrides[planId];
    } else {
      overrides[planId] = override;
    }
    updateConfig({ planOverrides: overrides });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
      <p className="text-gray-500 mt-1">Manage membership plans and control which plans are live</p>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {effectivePlans.map((plan) => {
          const isEnabled = enabledPlanIds.includes(plan.id);
          return (
            <div
              key={plan.id}
              className={`bg-white rounded-xl shadow-sm p-6 border-2 transition ${
                isEnabled ? "border-[var(--primary)]" : "border-gray-200 opacity-75"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                  {plan.isFree && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                      Free
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingPlan(plan)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                    title="Edit plan"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isEnabled}
                    onClick={() => togglePlan(plan.id)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 ${
                      isEnabled ? "bg-[var(--primary)]" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                        isEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
              <p className="text-2xl font-bold text-[var(--primary)] mt-2">
                {plan.price === 0 ? "Free" : `₹${plan.price}`}
              </p>
              <p className="text-sm text-gray-500">/{plan.duration} month(s)</p>
              <p className="text-sm text-gray-500 mt-4">~45 active subscribers</p>
              <p className={`text-xs font-medium mt-2 ${isEnabled ? "text-green-600" : "text-gray-400"}`}>
                {isEnabled ? "Live" : "Hidden"}
              </p>
            </div>
          );
        })}
      </div>

      {editingPlan && (
        <PlanEditModal
          plan={editingPlan}
          onSave={(override) => {
            handleSaveOverride(editingPlan.id, override);
          }}
          onClose={() => setEditingPlan(null)}
        />
      )}
    </div>
  );
}
