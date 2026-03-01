"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProfileFormSections } from "@/components/ProfileFormSections";
import { useProfiles } from "@/contexts/ProfilesContext";
import { getMemberIdDisplay } from "@/lib/memberId";
import { useState, useEffect } from "react";
import { Profile } from "@/types";

export default function SuperAdminEditProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { getProfileById, updateProfileById } = useProfiles();
  const id = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";
  const existing = getProfileById(id);
  const [profile, setProfile] = useState<Partial<Profile>>({});

  useEffect(() => {
    if (existing) setProfile({ ...existing });
  }, [existing, id]);

  if (!id) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Invalid profile ID</p>
        <Link href="/superadmin/users" className="text-[var(--primary)] mt-2 inline-block">← Back to Users</Link>
      </div>
    );
  }

  if (!existing) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Profile not found</p>
        <Link href="/superadmin/users" className="text-[var(--primary)] mt-2 inline-block">← Back to Users</Link>
      </div>
    );
  }

  const handleSave = () => {
    updateProfileById(id, profile);
    router.push("/superadmin/users");
  };

  return (
    <div className="max-w-2xl mx-auto pb-8">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <Link href="/superadmin/users" className="p-2 -ml-2 rounded-lg hover:bg-gray-100">
          <ChevronLeft size={24} />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Edit Profile</h1>
          <p className="text-sm text-gray-500">{getMemberIdDisplay(profile)} · {profile.fullName}</p>
        </div>
      </header>

      <div className="p-6 bg-white rounded-xl shadow-sm mt-6">
        <ProfileFormSections
          profile={profile}
          onChange={(u) => setProfile((p) => ({ ...p, ...u }))}
          adminMode
          userId={profile.id || profile.publicId || profile.memberId || id}
        />
        <Button fullWidth onClick={handleSave} className="mt-6">
          Save Changes
        </Button>
      </div>
    </div>
  );
}
