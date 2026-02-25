"use client";

export default function SuperAdminNotificationsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
      <p className="text-gray-500 mt-1">Send broadcast notifications to users</p>
      <div className="mt-6 bg-white rounded-xl shadow-sm p-8">
        <textarea className="w-full p-4 border rounded-lg" placeholder="Compose notification..." rows={4} />
        <button className="mt-4 px-6 py-2 bg-[var(--primary)] text-white rounded-lg">Send to All</button>
      </div>
    </div>
  );
}
