"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";

type AuthModalMode = "login" | "signup";

interface AuthModalProps {
  open: boolean;
  initialMode: AuthModalMode;
  onClose: () => void;
}

interface SignupForm {
  firstName: string;
  lastName: string;
  city: string;
  gender: "" | "male" | "female";
  dateOfBirth: string;
  mobile: string;
  password: string;
  confirmPassword: string;
}

const initialSignup: SignupForm = {
  firstName: "",
  lastName: "",
  city: "",
  gender: "",
  dateOfBirth: "",
  mobile: "",
  password: "",
  confirmPassword: "",
};

export function AuthModal({ open, initialMode, onClose }: AuthModalProps) {
  const router = useRouter();
  const { sendPhoneOtp, verifyPhoneOtp, signInWithPhonePassword } = useAuth();

  const [mode, setMode] = useState<AuthModalMode>("login");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [loginMobile, setLoginMobile] = useState("");
  const [loginOtp, setLoginOtp] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginMode, setLoginMode] = useState<"otp" | "password">("otp");

  const [signup, setSignup] = useState<SignupForm>(initialSignup);
  const [signupOtp, setSignupOtp] = useState("");
  const [signupStep, setSignupStep] = useState<1 | 2>(1);
  const compactInputClass = "py-2.5";

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setError("");
    setInfo("");
    setSuccess("");
    setLoading(false);
    setOtpSent(false);
    setLoginOtp("");
    setSignupOtp("");
    setSignupStep(1);
    setResendIn(0);
  }, [open, initialMode]);

  useEffect(() => {
    if (!open || resendIn <= 0) return;
    const id = window.setInterval(() => {
      setResendIn((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [open, resendIn]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, loading, onClose]);

  const normalizePhone = (digits10: string) => `+91${digits10}`;

  const afterSuccess = (message: string) => {
    setSuccess(message);
    setError("");
    setInfo("");
    window.setTimeout(() => {
      onClose();
      router.refresh();
    }, 900);
  };

  const sendLoginOtp = async () => {
    if (loading) return;
    setError("");
    setInfo("");
    setSuccess("");
    if (loginMobile.length !== 10) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    const result = await sendPhoneOtp(normalizePhone(loginMobile), "login");
    setLoading(false);
    if (result.error) {
      setError(result.error);
      if (result.retryAfter) setResendIn(result.retryAfter);
      return;
    }
    setOtpSent(true);
    setInfo("OTP sent. It is valid for 10 minutes.");
    setResendIn(result.cooldownSeconds ?? 30);
  };

  const verifyLoginOtp = async () => {
    if (loading) return;
    setError("");
    setInfo("");
    if (loginOtp.length !== 6) {
      setError("Enter 6-digit OTP");
      return;
    }
    setLoading(true);
    const result = await verifyPhoneOtp(normalizePhone(loginMobile), loginOtp);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    afterSuccess("Signed in successfully");
  };

  const doPasswordLogin = async () => {
    if (loading) return;
    setError("");
    setInfo("");
    if (loginMobile.length !== 10) return setError("Enter a valid 10-digit mobile number");
    if (!loginPassword) return setError("Enter your password");
    setLoading(true);
    const result = await signInWithPhonePassword(normalizePhone(loginMobile), loginPassword);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    afterSuccess("Signed in successfully");
  };

  const sendSignupOtp = async () => {
    if (loading) return;
    setError("");
    setInfo("");
    if (!signup.gender) return setError("Please select gender");
    if (!signup.firstName.trim()) return setError("First name is required");
    if (!signup.city.trim()) return setError("City is required");
    if (!signup.dateOfBirth) return setError("Date of birth is required");
    if (signup.mobile.length !== 10) return setError("Enter a valid 10-digit mobile number");
    if (!signup.password || signup.password.length < 8) return setError("Password must be at least 8 characters");
    if (signup.password !== signup.confirmPassword) return setError("Passwords do not match");

    setLoading(true);
    const result = await sendPhoneOtp(normalizePhone(signup.mobile), "signup");
    setLoading(false);
    if (result.error) {
      setError(result.error);
      if (result.retryAfter) setResendIn(result.retryAfter);
      return;
    }
    setSignupStep(2);
    setInfo("OTP sent. It is valid for 10 minutes.");
    setResendIn(result.cooldownSeconds ?? 30);
  };

  const verifySignupOtp = async () => {
    if (loading) return;
    setError("");
    setInfo("");
    if (signupOtp.length !== 6) return setError("Enter 6-digit OTP");
    setLoading(true);
    const fullName = [signup.firstName, signup.lastName].filter(Boolean).join(" ").trim();
    const birthYear = Number((signup.dateOfBirth.match(/^\d{4}/) || [])[0]) || undefined;
    const result = await verifyPhoneOtp(normalizePhone(signup.mobile), signupOtp, signup.password, {
      first_name: signup.firstName.trim(),
      last_name: signup.lastName.trim() || undefined,
      full_name: fullName || undefined,
      gender: signup.gender || undefined,
      city: signup.city.trim(),
      date_of_birth: signup.dateOfBirth,
      birth_year: birthYear,
    });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    afterSuccess("Account created successfully");
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/45 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-4"
      onClick={() => {
        if (!loading) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Authentication"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-white shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
          <div className="inline-flex p-1 rounded-xl bg-[var(--color-border)]/60">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
                setInfo("");
                setSuccess("");
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                mode === "login" ? "bg-[var(--primary)] text-white" : "text-gray-600"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError("");
                setInfo("");
                setSuccess("");
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                mode === "signup" ? "bg-[var(--primary)] text-white" : "text-gray-600"
              }`}
            >
              Sign Up
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-3 sm:p-4 space-y-2.5 overflow-y-auto">
          {mode === "login" ? (
            <>
              <div className="inline-flex p-1 rounded-lg bg-gray-100">
                <button
                  type="button"
                  onClick={() => setLoginMode("otp")}
                  className={`px-3 py-1 text-xs rounded-md ${loginMode === "otp" ? "bg-white shadow-sm" : "text-gray-500"}`}
                >
                  OTP
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMode("password")}
                  className={`px-3 py-1 text-xs rounded-md ${loginMode === "password" ? "bg-white shadow-sm" : "text-gray-500"}`}
                >
                  Password
                </button>
              </div>

              <Input
                label="Mobile Number"
                type="tel"
                value={loginMobile}
                onChange={(e) => setLoginMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit mobile number"
                className={compactInputClass}
              />

              {loginMode === "otp" && otpSent && (
                <>
                  <p className="text-xs text-gray-500">OTP is valid for 10 minutes.</p>
                  <Input
                    label="Enter OTP"
                    value={loginOtp}
                    onChange={(e) => setLoginOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="6-digit OTP"
                    inputMode="numeric"
                    className={compactInputClass}
                  />
                </>
              )}

              {loginMode === "password" && (
                <Input
                  label="Password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Your password"
                  className={compactInputClass}
                />
              )}

              {error && <p className="text-sm text-red-500">{error}</p>}
              {info && <p className="text-sm text-blue-600">{info}</p>}
              {success && <p className="text-sm text-green-600">{success}</p>}

              {loginMode === "otp" ? (
                !otpSent ? (
                  <Button fullWidth onClick={sendLoginOtp} disabled={loading}>
                    {loading ? "Sending OTP..." : "Send OTP"}
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Button fullWidth onClick={verifyLoginOtp} disabled={loading} className="py-2.5">
                      {loading ? "Verifying..." : "Verify & Sign In"}
                    </Button>
                    <button
                      type="button"
                      onClick={sendLoginOtp}
                      disabled={loading || resendIn > 0}
                      className="w-full text-xs text-[var(--primary)] disabled:text-gray-400"
                    >
                      {resendIn > 0 ? `Resend OTP in ${resendIn}s` : "Resend OTP"}
                    </button>
                  </div>
                )
              ) : (
                <Button fullWidth onClick={doPasswordLogin} disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              )}
            </>
          ) : (
            <>
              {signupStep === 1 ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="First Name"
                      value={signup.firstName}
                      onChange={(e) => setSignup((s) => ({ ...s, firstName: e.target.value }))}
                      className={compactInputClass}
                    />
                    <Input
                      label="Last Name"
                      value={signup.lastName}
                      onChange={(e) => setSignup((s) => ({ ...s, lastName: e.target.value }))}
                      className={compactInputClass}
                    />
                  </div>

                  <Input
                    label="City"
                    value={signup.city}
                    onChange={(e) => setSignup((s) => ({ ...s, city: e.target.value }))}
                    className={compactInputClass}
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <div className="flex gap-4">
                      {(["male", "female"] as const).map((g) => (
                        <label key={g} className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="signup-gender"
                            checked={signup.gender === g}
                            onChange={() => setSignup((s) => ({ ...s, gender: g }))}
                          />
                          <span className="capitalize">{g}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <Input
                    label="Date of Birth"
                    type="date"
                    value={signup.dateOfBirth}
                    onChange={(e) => setSignup((s) => ({ ...s, dateOfBirth: e.target.value }))}
                    max={new Date().toISOString().slice(0, 10)}
                    className={compactInputClass}
                  />

                  <Input
                    label="Mobile Number"
                    type="tel"
                    value={signup.mobile}
                    onChange={(e) => setSignup((s) => ({ ...s, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                    placeholder="10-digit mobile number"
                    className={compactInputClass}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="Password"
                      type="password"
                      value={signup.password}
                      onChange={(e) => setSignup((s) => ({ ...s, password: e.target.value }))}
                      placeholder="Min 8 chars"
                      className={compactInputClass}
                    />
                    <Input
                      label="Confirm Password"
                      type="password"
                      value={signup.confirmPassword}
                      onChange={(e) => setSignup((s) => ({ ...s, confirmPassword: e.target.value }))}
                      className={compactInputClass}
                    />
                  </div>

                  {error && <p className="text-sm text-red-500">{error}</p>}
                  {info && <p className="text-sm text-blue-600">{info}</p>}
                  <Button fullWidth onClick={sendSignupOtp} disabled={loading}>
                    {loading ? "Sending OTP..." : "Continue"}
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-500">OTP sent to +91 {signup.mobile}. Valid for 10 minutes.</p>
                  <Input
                    label="Enter OTP"
                    value={signupOtp}
                    onChange={(e) => setSignupOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="6-digit OTP"
                    inputMode="numeric"
                    className={compactInputClass}
                  />
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  {info && <p className="text-sm text-blue-600">{info}</p>}
                  {success && <p className="text-sm text-green-600">{success}</p>}
                  <Button fullWidth onClick={verifySignupOtp} disabled={loading}>
                    {loading ? "Verifying..." : "Verify & Create Account"}
                  </Button>
                  <button
                    type="button"
                    onClick={sendSignupOtp}
                    disabled={loading || resendIn > 0}
                    className="w-full text-xs text-[var(--primary)] disabled:text-gray-400"
                  >
                    {resendIn > 0 ? `Resend OTP in ${resendIn}s` : "Resend OTP"}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

