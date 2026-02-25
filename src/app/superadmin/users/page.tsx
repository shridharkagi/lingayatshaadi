"use client";

import { mockProfiles } from "@/data/mock";
import { getAge } from "@/lib/utils";

export default function SuperAdminUsersPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Users Management</h1>
      <p className="text-gray-500 mt-1">Manage all registered users</p>
      <div className="mt-6 bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Member ID</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Name</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Age</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Location</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Status</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {mockProfiles.map((p) => (
              <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-6 py-4 text-sm">{p.memberId}</td>
                <td className="px-6 py-4 font-medium">{p.fullName}</td>
                <td className="px-6 py-4 text-sm">{getAge(p.dateOfBirth)}</td>
                <td className="px-6 py-4 text-sm">{p.city}, {p.state}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${p.verified ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {p.verified ? "Verified" : "Pending"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button className="text-[var(--primary)] text-sm font-medium hover:underline">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
