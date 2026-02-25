"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    mobile: "",
    city: "",
    gender: "" as "" | "male" | "female",
    dateOfBirth: "",
  });
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

  const updateForm = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError("");
  };

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.password || !form.mobile || !form.city || !form.gender || !form.dateOfBirth) {
      setError("Please fill all fields");
      return;
    }
    setStep(2);
  };

  const handleStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError("Enter 6-digit OTP");
      return;
    }
    sessionStorage.setItem("lingayat_signup_email", form.email);
    sessionStorage.setItem("lingayat_signup_data", JSON.stringify(form));
    router.push("/profile/complete");
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col p-6">
      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
        <Link href="/login" className="flex items-center gap-2 mb-8">
          <Heart className="w-8 h-8 text-[var(--primary)] fill-[var(--primary)]" />
          <span className="text-xl font-bold text-[var(--primary)]">LingayatShaadi</span>
        </Link>
        <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">
          {step === 1 ? "Create Account" : "Verify Email"}
        </h1>
        <p className="text-gray-600 mb-8">
          {step === 1 ? "Enter your details to get started" : "We sent a 6-digit code to your email"}
        </p>

        {step === 1 ? (
          <form onSubmit={handleStep1} className="space-y-4">
            <Input
              label="Full Name"
              placeholder="Enter your full name"
              value={form.fullName}
              onChange={(e) => updateForm("fullName", e.target.value)}
            />
            <Input
              label="Email"
              type="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={(e) => updateForm("email", e.target.value)}
            />
            <Input
              label="Mobile Number"
              type="tel"
              placeholder="Enter 10-digit mobile number"
              value={form.mobile}
              onChange={(e) => updateForm("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))}
              maxLength={10}
            />
            <Input
              label="City"
              placeholder="Enter your city"
              value={form.city}
              onChange={(e) => updateForm("city", e.target.value)}
            />
            <Input
              label="Password"
              type="password"
              placeholder="Create a password"
              value={form.password}
              onChange={(e) => updateForm("password", e.target.value)}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
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
            <Input
              label="Date of Birth"
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => updateForm("dateOfBirth", e.target.value)}
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" fullWidth size="lg">
              Continue
            </Button>
          </form>
        ) : (
          <form onSubmit={handleStep2} className="space-y-4">
            <Input
              label="OTP"
              placeholder="Enter 6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              maxLength={6}
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" fullWidth size="lg">
              Verify & Continue
            </Button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-gray-500 text-sm"
            >
              Change email
            </button>
          </form>
        )}

        <p className="text-center text-gray-600 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--primary)] font-semibold">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
