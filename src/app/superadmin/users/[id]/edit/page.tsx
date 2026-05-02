"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProfileFormSections } from "@/components/ProfileFormSections";
import { getMemberIdDisplay } from "@/lib/memberId";
import { useState, useEffect } from "react";
import { Profile } from "@/types";
import { getProfileById, updateProfileById } from "@/lib/api/profiles";
import { parseDobDdMmYyyyToIso } from "@/lib/dateOfBirth";

export default function SuperAdminEditProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";
  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      const { data, error } = await getProfileById(id);
      if (cancelled) return;
      if (error || !data) {
        setError(error || "Profile not found");
        setProfile({});
      } else {
        setProfile({ ...data });
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!id) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Invalid profile ID</p>
        <Link href="/superadmin/users" className="text-[var(--primary)] mt-2 inline-block">← Back to Users</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Loading profile...</p>
        <Link href="/superadmin/users" className="text-[var(--primary)] mt-2 inline-block">← Back to Users</Link>
      </div>
    );
  }
  // Only block the editor when the profile failed to load — save validation errors must stay inline.
  if (!profile.id) {
    return (
      <div className="p-8">
        <p className="text-gray-500">{error || "Profile not found"}</p>
        <Link href="/superadmin/users" className="text-[var(--primary)] mt-2 inline-block">← Back to Users</Link>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const normalizedDob = parseDobDdMmYyyyToIso(String(profile.dateOfBirth || ""));
    if (profile.dateOfBirth && !normalizedDob) {
      setSaving(false);
      setError("Date of birth must be in dd/mm/yyyy format.");
      return;
    }
    const payload: Partial<Profile> = {
      ...profile,
      ...(normalizedDob ? { dateOfBirth: normalizedDob } : {}),
    };
    const { error } = await updateProfileById(id, payload, { skipModeration: true });
    setSaving(false);
    if (error) {
      setError(error);
      return;
    }
    router.push("/superadmin/moderation");
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
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <ProfileFormSections
          profile={profile}
          onChange={(u) => setProfile((p) => ({ ...p, ...u }))}
          adminMode
          userId={profile.id || profile.publicId || profile.memberId || id}
        />
        <Button fullWidth onClick={handleSave} className="mt-6" disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
