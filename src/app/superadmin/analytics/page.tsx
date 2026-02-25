"use client";

export default function SuperAdminAnalyticsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
      <p className="text-gray-500 mt-1">Detailed platform analytics</p>
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">User Growth</h3>
          <div className="h-48 flex items-end justify-around gap-2">
            {[40, 65, 45, 80, 55, 90, 70, 95, 85, 100].map((h, i) => (
              <div key={i} className="flex-1 bg-[var(--primary)]/20 rounded-t" style={{ height: `${h}%` }} />
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-2">Last 10 days</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Engagement Metrics</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Daily Active Users</p>
              <p className="text-xl font-bold">342</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg. Session Duration</p>
              <p className="text-xl font-bold">12 min</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Conversion Rate</p>
              <p className="text-xl font-bold">8.3%</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 lg:col-span-2">
          <h3 className="font-semibold text-gray-900 mb-4">Top Locations</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { city: "Bangalore", count: 312 },
              { city: "Mumbai", count: 245 },
              { city: "Hyderabad", count: 198 },
              { city: "Mysore", count: 156 },
            ].map((loc) => (
              <div key={loc.city} className="p-4 rounded-lg bg-gray-50">
                <p className="font-medium">{loc.city}</p>
                <p className="text-2xl font-bold text-[var(--primary)]">{loc.count}</p>
                <p className="text-xs text-gray-500">users</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
