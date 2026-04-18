"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";
import { syntheticEmailForPhone } from "@/lib/phoneAuth";

type ProfileFor = "self" | "parent";

export default function SignupPage() {
  const router = useRouter();
  const { sendPhoneOtp, verifyPhoneOtp } = useAuth();
  const [step, setStep] = useState(1);
  const [profileFor, setProfileFor] = useState<ProfileFor | "">("");
  const [form, setForm] = useState({
    fullName: "",
    password: "",
    confirmPassword: "",
    mobile: "",
    city: "",
    gender: "" as "" | "male" | "female",
    dateOfBirth: "",
  });
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const updateForm = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError("");
  };

  const phoneE164 = () => `+91${form.mobile.replace(/\D/g, "")}`;

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileFor) {
      setError("Please select who this profile is for");
      return;
    }
    if (!form.fullName || !form.mobile || !form.city || !form.gender) {
      setError("Please fill all required fields");
      return;
    }
    if (profileFor === "self" && !form.dateOfBirth) {
      setError("Please fill all required fields");
      return;
    }
    if (form.mobile.replace(/\D/g, "").length !== 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }
    if (!form.password || form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    const result = await sendPhoneOtp(phoneE164());
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setStep(2);
    }
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError("Enter 6-digit OTP");
      return;
    }

    setLoading(true);
    const result = await verifyPhoneOtp(phoneE164(), otp, form.password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    const digits = form.mobile.replace(/\D/g, "");
    const placeholderEmail = syntheticEmailForPhone(digits);
    sessionStorage.setItem("lingayat_signup_email", placeholderEmail);
    sessionStorage.setItem(
      "lingayat_signup_data",
      JSON.stringify({
        profileFor,
        fullName: form.fullName,
        mobile: form.mobile,
        city: form.city,
        gender: form.gender,
        dateOfBirth: profileFor === "self" ? form.dateOfBirth : undefined,
      })
    );
    router.push("/profile/complete");
  };

  const inputClass = "py-1.5 px-3 md:py-3 md:px-4";

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col overflow-hidden p-4 md:p-6 safe-area-inset">
      <div className="flex-1 flex flex-col justify-start md:justify-center min-h-0 max-w-md mx-auto w-full overflow-y-auto">
        <Link href="/login" className="flex items-center gap-2 mb-3 md:mb-6 flex-shrink-0">
          <Heart className="w-6 h-6 md:w-8 md:h-8 text-[var(--primary)] fill-[var(--primary)]" />
          <span className="text-base md:text-xl font-bold text-[var(--primary)]">LingayatShaadi</span>
        </Link>
        <h1 className="text-xl md:text-2xl font-bold text-[var(--foreground)] mb-1 md:mb-2 flex-shrink-0">
          {step === 1 ? "Create Account" : "Verify mobile"}
        </h1>
        <p className="text-gray-600 text-sm md:text-base mb-4 md:mb-6 flex-shrink-0">
          {step === 1
            ? "Enter your details to get started"
            : "We sent a 6-digit code to your mobile number"}
        </p>

        <div className="flex-1 min-h-0 overflow-y-auto pb-4">
          {step === 1 ? (
            <form onSubmit={handleStep1} className="space-y-1.5 md:space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Who is this profile for?</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="profileFor"
                      checked={profileFor === "self"}
                      onChange={() => setProfileFor("self")}
                      className="accent-[var(--primary)]"
                    />
                    <span>Myself</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="profileFor"
                      checked={profileFor === "parent"}
                      onChange={() => setProfileFor("parent")}
                      className="accent-[var(--primary)]"
                    />
                    <span>My child/ward</span>
                  </label>
                </div>
              </div>

              <Input
                label={profileFor === "parent" ? "Your full name (account holder)" : "Full Name"}
                placeholder={profileFor === "parent" ? "e.g. Deepak" : "Enter your full name"}
                value={form.fullName}
                onChange={(e) => updateForm("fullName", e.target.value)}
                className={inputClass}
              />
              <Input
                label="Mobile Number"
                type="tel"
                placeholder="Enter 10-digit mobile number"
                value={form.mobile}
                onChange={(e) => updateForm("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))}
                maxLength={10}
                autoComplete="tel-national"
                className={inputClass}
              />
              <Input
                label="Password"
                type="password"
                placeholder="At least 8 characters"
                value={form.password}
                onChange={(e) => updateForm("password", e.target.value)}
                autoComplete="new-password"
                className={inputClass}
              />
              <Input
                label="Confirm password"
                type="password"
                placeholder="Re-enter password"
                value={form.confirmPassword}
                onChange={(e) => updateForm("confirmPassword", e.target.value)}
                autoComplete="new-password"
                className={inputClass}
              />
              <Input
                label="City"
                placeholder="Enter your city"
                value={form.city}
                onChange={(e) => updateForm("city", e.target.value)}
                className={inputClass}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {profileFor === "parent" ? "Your gender (account holder)" : "Gender"}
                </label>
                <div className="flex gap-4">
                  {(["male", "female"] as const).map((g) => (
                    <label key={g} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="gender"
                        checked={form.gender === g}
                        onChange={() => updateForm("gender", g)}
                        className="accent-[var(--primary)]"
                      />
                      <span className="capitalize">{g}</span>
                    </label>
                  ))}
                </div>
              </div>
              {profileFor === "self" && (
                <Input
                  label="Date of Birth"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => updateForm("dateOfBirth", e.target.value)}
                  className={inputClass}
                />
              )}
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <Button type="submit" fullWidth size="md" disabled={loading}>
                {loading ? "Sending OTP..." : "Continue"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleStep2} className="space-y-2 md:space-y-4">
              <p className="text-sm text-gray-600">Code sent to +91 {form.mobile}</p>
              <Input
                label="OTP"
                placeholder="Enter 6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                className={inputClass}
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <Button type="submit" fullWidth size="md" disabled={loading}>
                {loading ? "Verifying..." : "Verify & Continue"}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setOtp("");
                  setError("");
                }}
                className="w-full text-gray-500 text-sm py-1"
              >
                Change number or details
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-gray-600 text-sm mt-3 md:mt-6 flex-shrink-0 pb-safe">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--primary)] font-semibold">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
