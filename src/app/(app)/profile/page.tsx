"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Edit2, Shield, Heart, Settings, ChevronRight, Camera, Images } from "lucide-react";
import { getAge } from "@/lib/utils";

export default function MyProfilePage() {
  const { user, isLoggedIn, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isLoggedIn) router.replace("/login");
  }, [loading, isLoggedIn, router]);

  if (loading || !user) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <header className="bg-[var(--primary)] text-white px-4 py-6 rounded-b-3xl">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">My Profile</h1>
          <Link href="/settings" className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition">
            <Settings size={20} />
          </Link>
        </div>
      </header>

      <div className="px-0 -mt-4 space-y-6">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="relative h-48 lg:h-64 bg-gray-200">
            <Image
              src={user.profilePhoto || "/placeholder.svg"}
              alt={user.fullName}
              fill
              className="object-cover"
              unoptimized
            />
            <Link href="/profile/edit" className="absolute bottom-2 right-2 p-2 rounded-full bg-white/90 hover:bg-white transition">
              <Camera size={20} className="text-[var(--primary)]" />
            </Link>
            <div className="absolute bottom-2 left-2 right-14 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white drop-shadow-lg">{user.fullName}</h2>
                <p className="text-white/90 text-sm">{getAge(user.dateOfBirth)} yrs • {user.height}&quot; • {user.maritalStatus}</p>
              </div>
              {user.verified && (
                <span className="bg-[var(--success)] text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  <Shield size={12} /> Verified
                </span>
              )}
            </div>
          </div>
          <div className="p-4 space-y-2">
            <Link href="/profile/edit" className="flex items-center justify-between p-3 rounded-xl bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 transition">
              <span className="font-medium flex items-center gap-2">
                <Edit2 size={18} />
                Edit Profile
              </span>
              <ChevronRight size={20} className="text-gray-400" />
            </Link>
            <Link href="/profile/preferences" className="flex items-center justify-between p-3 rounded-xl bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 transition">
              <span className="font-medium flex items-center gap-2">
                <Heart size={18} />
                Match Preferences
              </span>
              <ChevronRight size={20} className="text-gray-400" />
            </Link>
            <Link href="/profile/photos" className="flex items-center justify-between p-3 rounded-xl bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 transition">
              <span className="font-medium flex items-center gap-2">
                <Images size={18} />
                Photo Gallery
              </span>
              <ChevronRight size={20} className="text-gray-400" />
            </Link>
            <Link href="/membership" className="flex items-center justify-between p-3 rounded-xl bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 transition">
              <span className="font-medium flex items-center gap-2">
                <Shield size={18} />
                Trust Badge & Membership
              </span>
              <ChevronRight size={20} className="text-gray-400" />
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 lg:p-6">
          <h3 className="font-semibold text-[var(--foreground)] mb-3">Profile Details</h3>
          {user.aboutMeVisible && user.aboutMe && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-500 mb-1">About Me</h4>
              <p className="text-gray-700">{user.aboutMe}</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Member ID</span>
              <span>{user.memberId}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Caste</span>
              <span>{user.caste} {user.subCaste && `• ${user.subCaste}`}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Education</span>
              <span>{user.qualification || "-"}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Profession</span>
              <span>{user.profession || "-"}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Location</span>
              <span>{user.city}, {user.state}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Contact</span>
              <span>{user.contact || "-"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
