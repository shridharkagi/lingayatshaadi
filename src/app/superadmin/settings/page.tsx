"use client";

export default function SuperAdminSettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      <p className="text-gray-500 mt-1">Platform configuration</p>
      <div className="mt-6 bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Site Name</label>
          <input type="text" defaultValue="LingayatShaadi" className="mt-1 w-full px-4 py-2 border rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Support Email</label>
          <input type="email" defaultValue="support@lingayatshaadi.com" className="mt-1 w-full px-4 py-2 border rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">New User Approval</label>
          <select className="mt-1 w-full px-4 py-2 border rounded-lg">
            <option>Auto-approve</option>
            <option>Manual review</option>
          </select>
        </div>
        <button className="px-6 py-2 bg-[var(--primary)] text-white rounded-lg">Save</button>
      </div>
    </div>
  );
}
