"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, Heart } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";
import { useTurnstile } from "@/components/turnstile/TurnstileProvider";
import { parseDobDdMmYyyyToIso } from "@/lib/dateOfBirth";
import { formatIsoToDobDdMmYyyy } from "@/lib/dateOfBirth";

export default function SignupPage() {
  const router = useRouter();
  const { sendPhoneOtp, verifyPhoneOtp, isLoggedIn, profileComplete, loading: authLoading } = useAuth();
  const { prime: primeCaptcha } = useTurnstile();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({
    gender: "" as "" | "male" | "female",
    firstName: "",
    lastName: "",
    city: "",
    dateOfBirth: "",
    mobile: "",
    password: "",
    confirmPassword: "",
  });
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [dobPickerIso, setDobPickerIso] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) return;
    router.replace(profileComplete ? "/home" : "/profile/complete");
  }, [authLoading, isLoggedIn, profileComplete, router]);

  // Pre-fetch the Cloudflare Turnstile token in the background while the
  // user fills in the form, so the captcha round-trip doesn't block the
  // Send OTP click.
  useEffect(() => {
    primeCaptcha();
  }, [primeCaptcha]);

  const updateForm = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError("");
  };

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setInterval(() => {
      setResendIn((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendIn]);

  const phoneE164 = () => `+91${form.mobile.replace(/\D/g, "")}`;

  const redirectAfterSignup = () => {
    router.replace("/account?createProfile=1");
    // Fallback for dev-mode HMR compile stalls during navigation.
    window.setTimeout(() => {
      if (window.location.pathname === "/signup") {
        window.location.assign("/account?createProfile=1");
      }
    }, 1200);
  };

  const sendSignupOtp = async () => {
    if (loading) return;
    const normalizedDob = parseDobDdMmYyyyToIso(form.dateOfBirth);
    if (!form.gender) return setError("Please select gender");
    if (!form.firstName.trim()) return setError("First name is required");
    if (!form.city.trim()) return setError("City is required");
    if (!normalizedDob) return setError("Date of birth must be in dd/mm/yyyy format");
    if (form.mobile.replace(/\D/g, "").length !== 10)
      return setError("Enter a valid 10-digit mobile number");
    if (!form.password || form.password.length < 8)
      return setError("Password must be at least 8 characters");
    if (form.password !== form.confirmPassword)
      return setError("Passwords do not match");

    setError("");
    setInfo("");
    setSuccess("");
    setLoading(true);
    const result = await sendPhoneOtp(phoneE164(), "signup");
    setLoading(false);

    if (result.error) {
      setError(result.error);
      if (result.retryAfter) setResendIn(result.retryAfter);
    } else {
      setForm((f) => ({ ...f, dateOfBirth: normalizedDob }));
      setStep(2);
      const cooldown = result.cooldownSeconds ?? 30;
      setResendIn(cooldown);
      setInfo("OTP sent. It is valid for 10 minutes.");
    }
  };

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendSignupOtp();
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (otp.length !== 6) return setError("Enter 6-digit OTP");

    setError("");
    setInfo("");
    setLoading(true);
    const fullName = [form.firstName, form.lastName].filter(Boolean).join(" ").trim();
    const birthYear = Number((form.dateOfBirth.match(/^\d{4}/) || [])[0]) || undefined;
    const result = await verifyPhoneOtp(phoneE164(), otp, form.password, {
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim() || undefined,
      full_name: fullName,
      gender: form.gender as "male" | "female",
      city: form.city.trim(),
      date_of_birth: form.dateOfBirth,
      birth_year: birthYear,
    });
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setSuccess("Mobile verified successfully. Redirecting...");
    redirectAfterSignup();
  };

  const inputClass = "py-2 px-3 md:py-3 md:px-4";

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col overflow-hidden p-4 md:p-6 safe-area-inset">
      <div className="flex-1 flex flex-col justify-start md:justify-center min-h-0 max-w-md mx-auto w-full overflow-y-auto">
        <Link href="/login" className="flex items-center gap-2 mb-3 md:mb-6 flex-shrink-0">
          <Heart className="w-6 h-6 md:w-8 md:h-8 text-[var(--primary)] fill-[var(--primary)]" />
          <span className="leading-tight text-[var(--primary)]">
            <span className="block text-base md:text-xl font-bold">LingayatBandhu</span>
            <span className="block text-[10px] md:text-xs font-semibold tracking-[0.14em] uppercase text-[var(--primary)]/85">
              Matrimony
            </span>
          </span>
        </Link>
        <h1 className="text-xl md:text-2xl font-bold text-[var(--foreground)] mb-1 md:mb-2 flex-shrink-0">
          {step === 1 ? "Create Account" : "Verify Mobile"}
        </h1>
        <p className="text-gray-600 text-sm md:text-base mb-4 md:mb-6 flex-shrink-0">
          {step === 1
            ? "Just the basics — you can add detailed profiles after login."
            : "We sent a 6-digit code to your mobile number"}
        </p>

        <div className="flex-1 min-h-0 overflow-y-auto pb-4">
          {step === 1 ? (
            <form onSubmit={handleStep1} className="space-y-3 md:space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender <span className="text-red-500">*</span>
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

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label={<>First Name <span className="text-red-500">*</span></>}
                  placeholder="First name"
                  value={form.firstName}
                  onChange={(e) => updateForm("firstName", e.target.value)}
                  className={inputClass}
                  autoComplete="given-name"
                />
                <Input
                  label="Last Name"
                  placeholder="Last name"
                  value={form.lastName}
                  onChange={(e) => updateForm("lastName", e.target.value)}
                  className={inputClass}
                  autoComplete="family-name"
                />
              </div>

              <Input
                label={<>City <span className="text-red-500">*</span></>}
                placeholder="Enter your city"
                value={form.city}
                onChange={(e) => updateForm("city", e.target.value)}
                className={inputClass}
                autoComplete="address-level2"
              />

              <Input
                label={<>Date of Birth <span className="text-red-500">*</span></>}
                type="text"
                placeholder="dd/mm/yyyy"
                value={form.dateOfBirth}
                onChange={(e) => updateForm("dateOfBirth", e.target.value)}
                className={inputClass}
              />
              <div className="-mt-2">
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("signup-dob-picker") as HTMLInputElement | null;
                    el?.showPicker?.();
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-[var(--primary)] font-medium"
                >
                  <Calendar size={13} />
                  Select from calendar
                </button>
                <input
                  id="signup-dob-picker"
                  type="date"
                  value={dobPickerIso}
                  onChange={(e) => {
                    const ddmmyyyy = formatIsoToDobDdMmYyyy(e.target.value);
                    if (!ddmmyyyy) return;
                    setDobPickerIso(e.target.value);
                    updateForm("dateOfBirth", ddmmyyyy);
                  }}
                  className="sr-only"
                />
              </div>

              <Input
                label={<>Mobile Number <span className="text-red-500">*</span></>}
                type="tel"
                placeholder="10-digit mobile number"
                value={form.mobile}
                onChange={(e) => updateForm("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))}
                maxLength={10}
                autoComplete="tel-national"
                className={inputClass}
              />

              <Input
                label={<>Password <span className="text-red-500">*</span></>}
                type="password"
                placeholder="At least 8 characters"
                value={form.password}
                onChange={(e) => updateForm("password", e.target.value)}
                autoComplete="new-password"
                className={inputClass}
              />

              <Input
                label="Confirm Password"
                type="password"
                placeholder="Re-enter password"
                value={form.confirmPassword}
                onChange={(e) => updateForm("confirmPassword", e.target.value)}
                autoComplete="new-password"
                className={inputClass}
              />

              {error && <p className="text-red-500 text-sm">{error}</p>}
              {info && <p className="text-blue-600 text-sm">{info}</p>}

              <Button type="submit" fullWidth size="md" disabled={loading}>
                {loading ? "Sending OTP..." : "Sign Up"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleStep2} className="space-y-3 md:space-y-4">
              <p className="text-sm text-gray-600">Code sent to +91 {form.mobile}</p>
              <p className="text-xs text-gray-500">OTP is valid for 10 minutes.</p>
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
              {info && <p className="text-blue-600 text-sm">{info}</p>}
              {success && <p className="text-green-600 text-sm">{success}</p>}
              <Button type="submit" fullWidth size="md" disabled={loading}>
                {loading ? "Verifying..." : "Verify & Create Account"}
              </Button>
              <button
                type="button"
                onClick={sendSignupOtp}
                disabled={loading || resendIn > 0}
                className="w-full text-sm text-[var(--primary)] font-medium py-1 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {resendIn > 0 ? `Resend OTP in ${resendIn}s` : "Resend OTP"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setOtp("");
                  setError("");
                  setInfo("");
                  setSuccess("");
                  setResendIn(0);
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
