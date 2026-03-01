"use client";

import Link from "next/link";
import { Users, MessageSquare, CreditCard, TrendingUp, UserPlus, Eye, Heart } from "lucide-react";
import { useProfiles } from "@/contexts/ProfilesContext";
import { getMemberIdDisplay } from "@/lib/memberId";

const stats = [
  { label: "Total Users", value: "1,247", icon: Users, color: "bg-blue-500", change: "+12%" },
  { label: "Active Today", value: "342", icon: UserPlus, color: "bg-green-500", change: "+8%" },
  { label: "Messages Sent", value: "2,891", icon: MessageSquare, color: "bg-purple-500", change: "+24%" },
  { label: "Premium Subscriptions", value: "156", icon: CreditCard, color: "bg-amber-500", change: "+5%" },
  { label: "Profile Views", value: "8,432", icon: Eye, color: "bg-rose-500", change: "+18%" },
  { label: "Interests Sent", value: "1,203", icon: Heart, color: "bg-indigo-500", change: "+15%" },
];

export default function SuperAdminDashboard() {
  const { profiles } = useProfiles();
  const recentProfiles = profiles.slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your matrimonial platform</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map(({ label, value, icon: Icon, color, change }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                <p className="text-sm text-green-600 mt-1">{change} from last week</p>
              </div>
              <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Recent Registrations</h2>
          <div className="space-y-3">
            {recentProfiles.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                  <img src={p.profilePhoto} alt={`Profile photo of ${p.fullName}`} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{p.fullName}</p>
                  <p className="text-sm text-gray-500">{getMemberIdDisplay(p)}</p>
                </div>
                <span className="text-xs text-gray-500">2 days ago</span>
              </div>
            ))}
          </div>
          <Link href="/superadmin/users" className="block text-center py-2 text-[var(--primary)] font-medium mt-4 hover:underline">
            View all users
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Quick Stats</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Gender Distribution</p>
              <div className="flex gap-4 mt-2">
                <div className="flex-1">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--primary)] rounded-full" style={{ width: "60%" }} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Male: 60%</p>
                </div>
                <div className="flex-1">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: "40%" }} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Female: 40%</p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500">Verification Status</p>
              <div className="flex gap-4 mt-2">
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">Verified: 45%</span>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">Pending: 30%</span>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">Unverified: 25%</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500">Revenue (This Month)</p>
              <p className="text-2xl font-bold text-[var(--primary)] mt-1">₹2,45,000</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
