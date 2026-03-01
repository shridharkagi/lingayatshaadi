"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";
import { PartnerPreference } from "@/types";
import { MARITAL_STATUS_OPTIONS, PROFESSION_TYPES, SUB_CASTE_OPTIONS } from "@/data/constants";

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
    <div className="max-w-2xl mx-auto pb-8">
      <header className="bg-white border-b border-[var(--border)] px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-lg hover:bg-gray-100">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-semibold">Match Preferences</h1>
      </header>

      <div className="p-4 space-y-6">
        {/* Basic Preferences */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold text-[var(--foreground)] mb-4">Basic Details</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input 
                label="Age Min" 
                type="number" 
                placeholder="25" 
                value={pref.ageMin?.toString() || ""} 
                onChange={(e) => update("ageMin", parseInt(e.target.value) || undefined)} 
                min="18"
                max="100"
              />
              <Input 
                label="Age Max" 
                type="number" 
                placeholder="35" 
                value={pref.ageMax?.toString() || ""} 
                onChange={(e) => update("ageMax", parseInt(e.target.value) || undefined)} 
                min="18"
                max="100"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input 
                label="Height Min (ft)" 
                placeholder="5.0" 
                value={pref.heightMin || ""} 
                onChange={(e) => update("heightMin", e.target.value)} 
              />
              <Input 
                label="Height Max (ft)" 
                placeholder="6.0" 
                value={pref.heightMax || ""} 
                onChange={(e) => update("heightMax", e.target.value)} 
              />
            </div>
          </div>
        </div>

        {/* Marital Status */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold text-[var(--foreground)] mb-4">Marital Status</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {MARITAL_STATUS_OPTIONS.map((status) => {
              const isSelected = pref.maritalStatus?.includes(status);
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => {
                    const current = pref.maritalStatus?.split(",").map(s => s.trim()).filter(Boolean) || [];
                    const updated = isSelected
                      ? current.filter(s => s !== status)
                      : [...current, status];
                    update("maritalStatus", updated.join(", "));
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isSelected
                      ? "bg-[var(--primary)] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {status}
                </button>
              );
            })}
          </div>
        </div>

        {/* Religion & Caste */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold text-[var(--foreground)] mb-4">Religion & Caste</h2>
          <div className="space-y-4">
            <Input 
              label="Religion" 
              placeholder="Lingayat" 
              value={pref.religion || ""} 
              onChange={(e) => update("religion", e.target.value)} 
            />
            <Input 
              label="Caste" 
              placeholder="Any" 
              value={pref.caste || ""} 
              onChange={(e) => update("caste", e.target.value)} 
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sub-Caste Preferences
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 rounded-lg">
                {SUB_CASTE_OPTIONS.map((subCaste) => {
                  const isSelected = pref.subCaste?.includes(subCaste);
                  return (
                    <button
                      key={subCaste}
                      type="button"
                      onClick={() => {
                        const current = pref.subCaste?.split(",").map(s => s.trim()).filter(Boolean) || [];
                        const updated = isSelected
                          ? current.filter(s => s !== subCaste)
                          : [...current, subCaste];
                        update("subCaste", updated.join(", "));
                      }}
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium transition ${
                        isSelected
                          ? "bg-[var(--primary)] text-white"
                          : "bg-white text-gray-600 hover:bg-gray-100 border border-[var(--border)]"
                      }`}
                    >
                      {subCaste}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Education & Profession */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold text-[var(--foreground)] mb-4">Education & Career</h2>
          <div className="space-y-4">
            <Input 
              label="Education" 
              placeholder="Graduate, Post Graduate" 
              value={pref.education || ""} 
              onChange={(e) => update("education", e.target.value)} 
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profession Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PROFESSION_TYPES.map((type) => {
                  const isSelected = pref.profession?.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        const current = pref.profession?.split(",").map(s => s.trim()).filter(Boolean) || [];
                        const updated = isSelected
                          ? current.filter(s => s !== type)
                          : [...current, type];
                        update("profession", updated.join(", "));
                      }}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                        isSelected
                          ? "bg-[var(--primary)] text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input 
                label="Income Min (Lakhs)" 
                placeholder="5" 
                value={pref.incomeMin || ""} 
                onChange={(e) => update("incomeMin", e.target.value)} 
              />
              <Input 
                label="Income Max (Lakhs)" 
                placeholder="20" 
                value={pref.incomeMax || ""} 
                onChange={(e) => update("incomeMax", e.target.value)} 
              />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold text-[var(--foreground)] mb-4">Location</h2>
          <div className="space-y-4">
            <Input 
              label="City" 
              placeholder="Any city or multiple cities (comma separated)" 
              value={pref.city || ""} 
              onChange={(e) => update("city", e.target.value)} 
            />
            <Input 
              label="State" 
              placeholder="Any state or multiple states (comma separated)" 
              value={pref.state || ""} 
              onChange={(e) => update("state", e.target.value)} 
            />
            <Input 
              label="Country" 
              placeholder="India, USA, UK, etc." 
              value={pref.country || ""} 
              onChange={(e) => update("country", e.target.value)} 
            />
          </div>
        </div>

        {/* Lifestyle */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-semibold text-[var(--foreground)] mb-4">Lifestyle</h2>
          <Input 
            label="Food Habits" 
            placeholder="Vegetarian, Non-Vegetarian, Eggetarian" 
            value={pref.foodHabits || ""} 
            onChange={(e) => update("foodHabits", e.target.value)} 
          />
        </div>

        <Button fullWidth onClick={() => router.back()}>
          Save Preferences
        </Button>
      </div>
    </div>
  );
}
