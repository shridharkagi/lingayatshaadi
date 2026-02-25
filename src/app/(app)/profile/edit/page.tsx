"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";

export default function EditProfilePage() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-lg mx-auto">
      <header className="bg-white border-b border-[var(--border)] px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-lg">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-semibold">Edit Profile</h1>
      </header>

      <div className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">About Me</label>
          <textarea
            className="w-full px-4 py-3 rounded-xl border border-[var(--border)] min-h-[100px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            value={user.aboutMe || ""}
            onChange={(e) => updateProfile({ aboutMe: e.target.value })}
          />
        </div>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <span className="font-medium">Show About Me to others</span>
          <button
            onClick={() => updateProfile({ aboutMeVisible: !user.aboutMeVisible })}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${user.aboutMeVisible ? "bg-[var(--primary)] text-white" : "bg-gray-200 text-gray-600"}`}
          >
            {user.aboutMeVisible ? "Visible" : "Hidden"}
          </button>
        </div>
        <Input label="Full Name" value={user.fullName} onChange={(e) => updateProfile({ fullName: e.target.value })} />
        <Input label="Height" value={user.height} onChange={(e) => updateProfile({ height: e.target.value })} />
        <Input label="Marital Status" value={user.maritalStatus} onChange={(e) => updateProfile({ maritalStatus: e.target.value })} />
        <Input label="Caste" value={user.caste} onChange={(e) => updateProfile({ caste: e.target.value })} />
        <Input label="Sub-Caste" value={user.subCaste} onChange={(e) => updateProfile({ subCaste: e.target.value })} />
        <Input label="Qualification" value={user.qualification} onChange={(e) => updateProfile({ qualification: e.target.value })} />
        <Input label="Profession" value={user.profession} onChange={(e) => updateProfile({ profession: e.target.value })} />
        <Input label="City" value={user.city} onChange={(e) => updateProfile({ city: e.target.value })} />
        <Input label="State" value={user.state} onChange={(e) => updateProfile({ state: e.target.value })} />
        <Button fullWidth onClick={() => router.back()}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
