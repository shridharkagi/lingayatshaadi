"use client";

import { mockProfiles } from "@/data/mock";

export default function SuperAdminVerificationsPage() {
  const pending = mockProfiles.filter((p) => !p.verified);
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Verifications</h1>
      <p className="text-gray-500 mt-1">Review and approve profile verifications</p>
      <div className="mt-6 bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Member</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">ID Submitted</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pending.length > 0 ? (
              pending.map((p) => (
                <tr key={p.id} className="border-t border-gray-100">
                  <td className="px-6 py-4 font-medium">{p.fullName}</td>
                  <td className="px-6 py-4 text-sm">Aadhar</td>
                  <td className="px-6 py-4">
                    <button className="text-green-600 text-sm font-medium mr-2">Approve</button>
                    <button className="text-red-600 text-sm font-medium">Reject</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">No pending verifications</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
