"use client";

import { mockMembershipPlans } from "@/data/mock";

export default function SuperAdminSubscriptionsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
      <p className="text-gray-500 mt-1">Manage membership plans and revenue</p>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {mockMembershipPlans.map((plan) => (
          <div key={plan.id} className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900">{plan.name}</h3>
            <p className="text-2xl font-bold text-[var(--primary)] mt-2">₹{plan.price}</p>
            <p className="text-sm text-gray-500">/{plan.duration} month(s)</p>
            <p className="text-sm text-gray-500 mt-4">~45 active subscribers</p>
          </div>
        ))}
      </div>
    </div>
  );
}
