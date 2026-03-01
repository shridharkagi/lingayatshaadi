"use client";

import { useMemo } from "react";
import { mockMembershipPlans } from "@/data/mock";
import { useAppConfig } from "@/contexts/AppConfigContext";
import type { MembershipPlan } from "@/types";

export function useEffectivePlans(): MembershipPlan[] {
  const { config } = useAppConfig();
  const overrides = config.planOverrides ?? {};

  return useMemo(() => {
    return mockMembershipPlans.map((plan) => {
      const override = overrides[plan.id];
      const merged: MembershipPlan = {
        ...plan,
        ...override,
        id: plan.id,
      };
      merged.isFree = merged.price === 0;
      return merged;
    });
  }, [config.planOverrides]);
}
