"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { adminFetch } from "@/lib/api/adminClient";
import { KycDocumentsUpload } from "@/components/KycDocumentsUpload";

type ProfileLite = {
  id: string;
  full_name: string;
  public_id?: string;
  verified?: boolean;
  profile_status?: string;
  moderation_status?: string;
};

export default function VerificationProfilePage() {
  const params = useParams<{ id: string }>();
  const profileId = params?.id;
  const [profile, setProfile] = useState<ProfileLite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const load = async () => {
    if (!profileId) return;
    const res = await adminFetch(`/api/superadmin/review-center?tab=pending`);
    const json = (await res.json()) as { items?: ProfileLite[]; error?: string };
    if (!res.ok) {
      setError(json.error || "Failed to load profile");
      return;
    }
    const found = (json.items || []).find((p) => p.id === profileId) || null;
    if (!found) {
      const fallback = await adminFetch(`/api/superadmin/review-center?tab=rejected`);
      const fallbackJson = (await fallback.json()) as { items?: ProfileLite[] };
      const f = (fallbackJson.items || []).find((p) => p.id === profileId) || null;
      setProfile(f);
      return;
    }
    setProfile(found);
  };

  useEffect(() => {
    void load();
  }, [profileId]);

  const setVerified = async (verified: boolean) => {
    setError(null);
    setInfo(null);
    const res = await adminFetch("/api/superadmin/verifications/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId, verified }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(json.error || "Failed to update verification");
      return;
    }
    setInfo(verified ? "Profile marked verified." : "Profile marked not verified.");
    await load();
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">KYC Verification</h1>
          <p className="text-gray-500 mt-1">Review uploaded IDs and verify profile manually.</p>
        </div>
        <Link href="/superadmin/verifications" className="text-sm text-[var(--primary)] hover:underline">
          Back to Verifications
        </Link>
      </div>
      {profile && (
        <div className="mt-4 rounded-xl border bg-white p-4">
          <p className="font-semibold text-gray-900">{profile.full_name}</p>
          <p className="text-xs text-gray-500">{profile.public_id || profile.id}</p>
          <p className="text-xs text-gray-600 mt-1">
            Status: {profile.profile_status || profile.moderation_status || (profile.verified ? "verified" : "pending")}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => void setVerified(true)}
              className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700"
            >
              Mark Verified
            </button>
            <button
              onClick={() => void setVerified(false)}
              className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700"
            >
              Mark Not Verified
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 rounded-xl border bg-white p-4">
        <KycDocumentsUpload profileId={profileId} userId={profileId} adminMode />
      </div>

      {info && <p className="mt-3 text-sm text-emerald-700">{info}</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
