"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";
import { PartnerPreference } from "@/types";

export default function MatchPreferencesPage() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();
  const pref = user?.partnerPreference || {};

  const update = (key: keyof PartnerPreference, value: string | number | undefined) => {
    updateProfile({
      partnerPreference: { ...pref, [key]: value },
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <header className="bg-white border-b border-[var(--border)] px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-lg hover:bg-gray-100">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-semibold">Match Preferences</h1>
      </header>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Age Min" type="number" placeholder="25" value={pref.ageMin?.toString() || ""} onChange={(e) => update("ageMin", parseInt(e.target.value) || undefined)} />
          <Input label="Age Max" type="number" placeholder="35" value={pref.ageMax?.toString() || ""} onChange={(e) => update("ageMax", parseInt(e.target.value) || undefined)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Height Min" placeholder="5.4" value={pref.heightMin || ""} onChange={(e) => update("heightMin", e.target.value)} />
          <Input label="Height Max" placeholder="6.0" value={pref.heightMax || ""} onChange={(e) => update("heightMax", e.target.value)} />
        </div>
        <Input label="Marital Status" placeholder="Unmarried, Divorced, etc." value={pref.maritalStatus || ""} onChange={(e) => update("maritalStatus", e.target.value)} />
        <Input label="Religion" placeholder="Lingayat" value={pref.religion || ""} onChange={(e) => update("religion", e.target.value)} />
        <Input label="Education" placeholder="Graduate, Post Graduate" value={pref.education || ""} onChange={(e) => update("education", e.target.value)} />
        <Input label="Profession" placeholder="Any" value={pref.profession || ""} onChange={(e) => update("profession", e.target.value)} />
        <Input label="Food Habits" placeholder="Vegetarian, Non-Vegetarian" value={pref.foodHabits || ""} onChange={(e) => update("foodHabits", e.target.value)} />
        <Input label="City" placeholder="Any" value={pref.city || ""} onChange={(e) => update("city", e.target.value)} />
        <Input label="State" placeholder="Any" value={pref.state || ""} onChange={(e) => update("state", e.target.value)} />
        <Button fullWidth onClick={() => router.back()}>
          Save Preferences
        </Button>
      </div>
    </div>
  );
}
