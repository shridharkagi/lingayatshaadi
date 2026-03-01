"use client";

import { useState } from "react";
import Link from "next/link";
import { useProfiles } from "@/contexts/ProfilesContext";
import { getAge } from "@/lib/utils";
import { getProfileSlug, getMemberIdDisplay } from "@/lib/memberId";
import { UsersFilters, defaultUsersFilters } from "@/components/superadmin/UsersFilters";
import { useFilteredUsers } from "@/hooks/useFilteredUsers";
import type { Profile } from "@/types";

function getStatusDisplay(p: Profile) {
  const status = p.profileStatus ?? (p.verified ? "verified" : "pending");
  const styles: Record<string, string> = {
    verified: "bg-green-100 text-green-700",
    pending: "bg-yellow-100 text-yellow-700",
    rejected: "bg-red-100 text-red-700",
    suspended: "bg-gray-100 text-gray-700",
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs capitalize ${styles[status] || styles.pending}`}>
      {status}
    </span>
  );
}

export default function SuperAdminUsersPage() {
  const { profiles } = useProfiles();
  const [filters, setFilters] = useState(defaultUsersFilters);
  const filteredProfiles = useFilteredUsers(profiles, filters);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users Management</h1>
          <p className="text-gray-500 mt-1">Manage all registered users</p>
        </div>
        <Link
          href="/superadmin/users/create"
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary)]/90 transition"
        >
          Add Profile
        </Link>
      </div>

      <UsersFilters
        filters={filters}
        onChange={setFilters}
        onClear={() => setFilters(defaultUsersFilters)}
      />

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 text-sm text-gray-600">
          Showing {filteredProfiles.length} of {profiles.length} users
        </div>
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
            {filteredProfiles.map((p) => (
              <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-6 py-4 text-sm">{getMemberIdDisplay(p)}</td>
                <td className="px-6 py-4 font-medium">{p.fullName}</td>
                <td className="px-6 py-4 text-sm">{getAge(p.dateOfBirth)}</td>
                <td className="px-6 py-4 text-sm">{p.city}, {p.state}</td>
                <td className="px-6 py-4">{getStatusDisplay(p)}</td>
                <td className="px-6 py-4 flex gap-3">
                  <Link href={`/profile/${getProfileSlug(p)}`} className="text-[var(--primary)] text-sm font-medium hover:underline">
                    View
                  </Link>
                  <Link href={`/superadmin/users/${p.id}/edit`} className="text-[var(--primary)] text-sm font-medium hover:underline">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
