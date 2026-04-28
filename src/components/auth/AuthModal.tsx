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
  const { sendPhoneOtp, verifyPhoneOtp, signInWithPassword, resetPasswordWithPhoneOtp } = useAuth();

  const [mode, setMode] = useState<AuthModalMode>("login");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [loginMobile, setLoginMobile] = useState("");
  const [loginPasswordId, setLoginPasswordId] = useState("");
  const [loginOtp, setLoginOtp] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginMode, setLoginMode] = useState<"otp" | "password">("otp");
  const [passwordForgot, setPasswordForgot] = useState(false);
  const [forgotOtpSent, setForgotOtpSent] = useState(false);
  const [forgotMobile, setForgotMobile] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotPw1, setForgotPw1] = useState("");
  const [forgotPw2, setForgotPw2] = useState("");
  const [forgotResendIn, setForgotResendIn] = useState(0);

  const [signup, setSignup] = useState<SignupForm>(initialSignup);
  const [signupOtp, setSignupOtp] = useState("");
  const [signupStep, setSignupStep] = useState<1 | 2>(1);

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
    setLoginPasswordId("");
    setPasswordForgot(false);
    setForgotOtpSent(false);
    setForgotMobile("");
    setForgotOtp("");
    setForgotPw1("");
    setForgotPw2("");
    setForgotResendIn(0);
  }, [open, initialMode]);

  useEffect(() => {
    if (!open || resendIn <= 0) return;
    const id = window.setInterval(() => {
      setResendIn((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [open, resendIn]);

  useEffect(() => {
    if (!open || forgotResendIn <= 0) return;
    const id = window.setInterval(() => {
      setForgotResendIn((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [open, forgotResendIn]);

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
    const id = loginPasswordId.trim();
    if (!id) return setError("Enter mobile number");
    if (id.includes("@")) return setError("Enter mobile number");
    const d = id.replace(/\D/g, "");
    if (d.length !== 10) return setError("Enter a valid 10-digit mobile number");
    if (!loginPassword) return setError("Enter your password");
    setLoading(true);
    const identifier = normalizePhone(id.replace(/\D/g, "").slice(-10));
    const result = await signInWithPassword(identifier, loginPassword);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    afterSuccess("Signed in successfully");
  };

  const sendForgotOtp = async () => {
    if (loading) return;
    setError("");
    setInfo("");
    if (forgotMobile.length !== 10) {
      setError("Enter the mobile number for your account");
      return;
    }
    setLoading(true);
    const result = await sendPhoneOtp(normalizePhone(forgotMobile), "password_reset");
    setLoading(false);
    if (result.error) {
      setError(result.error);
      if (result.retryAfter) setForgotResendIn(result.retryAfter);
      return;
    }
    setForgotOtpSent(true);
    setInfo("OTP sent. It is valid for 10 minutes.");
    setForgotResendIn(result.cooldownSeconds ?? 30);
  };

  const submitForgotPassword = async () => {
    if (loading) return;
    setError("");
    setInfo("");
    if (forgotOtp.length !== 6) return setError("Enter the 6-digit OTP");
    if (!forgotPw1 || forgotPw1.length < 8) return setError("New password must be at least 8 characters");
    if (forgotPw1 !== forgotPw2) return setError("Passwords do not match");
    setLoading(true);
    const result = await resetPasswordWithPhoneOtp(normalizePhone(forgotMobile), forgotOtp, forgotPw1);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    afterSuccess("Password updated. You’re signed in.");
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
      className="fixed inset-0 z-[80] bg-black/45 backdrop-blur-[2px] flex items-center justify-center p-2 sm:p-4"
      onClick={() => {
        if (!loading) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Authentication"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-white shadow-2xl overflow-hidden flex flex-col max-h-[min(92dvh,92vh)] min-h-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 border-b border-[var(--color-border)] shrink-0">
          <div className="inline-flex p-0.5 sm:p-1 rounded-lg sm:rounded-xl bg-[var(--color-border)]/60">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
                setInfo("");
                setSuccess("");
              }}
              className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-md sm:rounded-lg text-sm font-medium transition ${
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
              className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-md sm:rounded-lg text-sm font-medium transition ${
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
            className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 text-gray-500"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-2 sm:p-4 space-y-1.5 sm:space-y-2.5">
            {mode === "login" ? (
              <>
                {!passwordForgot && (
                  <div className="inline-flex p-1 rounded-xl bg-gray-100 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setLoginMode("otp");
                        setPasswordForgot(false);
                      }}
                      className={`flex-1 sm:flex-none px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
                        loginMode === "otp" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                      }`}
                    >
                      OTP
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginMode("password");
                        setPasswordForgot(false);
                        setLoginPasswordId((prev) => prev || loginMobile);
                      }}
                      className={`flex-1 sm:flex-none px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
                        loginMode === "password" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                      }`}
                    >
                      Password
                    </button>
                  </div>
                )}

                {passwordForgot ? (
                  <>
                    <p className="text-sm font-semibold text-gray-900">Reset password</p>
                    <p className="text-[11px] sm:text-xs text-gray-500">
                      We&apos;ll text a code to your registered mobile number.
                    </p>
                    <Input
                      compact
                      label="Mobile Number"
                      type="tel"
                      value={forgotMobile}
                      onChange={(e) => setForgotMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="10-digit mobile number"
                      disabled={forgotOtpSent}
                    />
                    {forgotOtpSent && (
                      <>
                        <p className="text-[11px] sm:text-xs text-gray-500">OTP is valid for 10 minutes.</p>
                        <Input
                          compact
                          label="Enter OTP"
                          value={forgotOtp}
                          onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="6-digit OTP"
                          inputMode="numeric"
                        />
                        <Input
                          compact
                          label="New password"
                          type="password"
                          value={forgotPw1}
                          onChange={(e) => setForgotPw1(e.target.value)}
                          placeholder="Min 8 characters"
                        />
                        <Input
                          compact
                          label="Confirm new password"
                          type="password"
                          value={forgotPw2}
                          onChange={(e) => setForgotPw2(e.target.value)}
                        />
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setPasswordForgot(false);
                        setForgotOtpSent(false);
                        setForgotMobile("");
                        setForgotOtp("");
                        setForgotPw1("");
                        setForgotPw2("");
                        setForgotResendIn(0);
                        setError("");
                        setInfo("");
                      }}
                      className="text-xs text-[var(--primary)] font-medium"
                    >
                      ← Back to sign in
                    </button>
                  </>
                ) : (
                  <>
                    {loginMode === "otp" ? (
                      <Input
                        compact
                        label="Mobile Number"
                        type="tel"
                        value={loginMobile}
                        onChange={(e) => setLoginMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        placeholder="10-digit mobile number"
                      />
                    ) : (
                      <Input
                        compact
                        label="Enter Mobile Number"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        value={loginPasswordId}
                        onChange={(e) => setLoginPasswordId(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        placeholder="10-digit mobile number"
                      />
                    )}

                    {loginMode === "otp" && otpSent && (
                      <>
                        <p className="text-[11px] sm:text-xs text-gray-500">OTP is valid for 10 minutes.</p>
                        <Input
                          compact
                          label="Enter OTP"
                          value={loginOtp}
                          onChange={(e) => setLoginOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="6-digit OTP"
                          inputMode="numeric"
                        />
                      </>
                    )}

                    {loginMode === "password" && (
                      <>
                        <Input
                          compact
                          label="Password"
                          type="password"
                          autoComplete="current-password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="Your password"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPasswordForgot(true);
                            setForgotOtpSent(false);
                            setForgotMobile(loginMobile || loginPasswordId.replace(/\D/g, "").slice(-10) || "");
                            setForgotOtp("");
                            setForgotPw1("");
                            setForgotPw2("");
                            setError("");
                            setInfo("");
                          }}
                          className="text-[11px] sm:text-xs text-[var(--primary)] font-medium -mt-1"
                        >
                          Forgot password?
                        </button>
                      </>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                {signupStep === 1 ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 min-w-0">
                      <Input
                        compact
                        label="First Name"
                        value={signup.firstName}
                        onChange={(e) => setSignup((s) => ({ ...s, firstName: e.target.value }))}
                      />
                      <Input
                        compact
                        label="Last Name"
                        value={signup.lastName}
                        onChange={(e) => setSignup((s) => ({ ...s, lastName: e.target.value }))}
                      />
                    </div>

                    <Input
                      compact
                      label="City"
                      value={signup.city}
                      onChange={(e) => setSignup((s) => ({ ...s, city: e.target.value }))}
                    />

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-0.5 sm:mb-1">
                        Gender
                      </label>
                      <div className="flex gap-3 sm:gap-4">
                        {(["male", "female"] as const).map((g) => (
                          <label key={g} className="flex items-center gap-1.5 text-xs sm:text-sm">
                            <input
                              type="radio"
                              name="signup-gender"
                              checked={signup.gender === g}
                              onChange={() => setSignup((s) => ({ ...s, gender: g }))}
                              className="shrink-0"
                            />
                            <span className="capitalize">{g}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <Input
                      compact
                      label="Date of Birth"
                      type="date"
                      value={signup.dateOfBirth}
                      onChange={(e) => setSignup((s) => ({ ...s, dateOfBirth: e.target.value }))}
                      max={new Date().toISOString().slice(0, 10)}
                    />

                    <Input
                      compact
                      label="Mobile Number"
                      type="tel"
                      value={signup.mobile}
                      onChange={(e) =>
                        setSignup((s) => ({ ...s, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) }))
                      }
                      placeholder="10-digit mobile number"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                      <Input
                        compact
                        label="Password"
                        type="password"
                        value={signup.password}
                        onChange={(e) => setSignup((s) => ({ ...s, password: e.target.value }))}
                        placeholder="Min 8 chars"
                      />
                      <Input
                        compact
                        label="Confirm Password"
                        type="password"
                        value={signup.confirmPassword}
                        onChange={(e) => setSignup((s) => ({ ...s, confirmPassword: e.target.value }))}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-[11px] sm:text-xs text-gray-500">
                      OTP sent to +91 {signup.mobile}. Valid for 10 minutes.
                    </p>
                    <Input
                      compact
                      label="Enter OTP"
                      value={signupOtp}
                      onChange={(e) => setSignupOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="6-digit OTP"
                      inputMode="numeric"
                    />
                  </>
                )}
              </>
            )}
          </div>

          <div className="shrink-0 border-t border-[var(--color-border)] bg-white px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4 sm:pt-3 sm:pb-4 space-y-2">
            {error && <p className="text-xs sm:text-sm text-red-500 leading-snug">{error}</p>}
            {info && <p className="text-xs sm:text-sm text-blue-600 leading-snug">{info}</p>}
            {success && <p className="text-xs sm:text-sm text-green-600 leading-snug">{success}</p>}

            {mode === "login" ? (
              passwordForgot ? (
                !forgotOtpSent ? (
                  <Button
                    fullWidth
                    size="sm"
                    onClick={sendForgotOtp}
                    disabled={loading}
                    className="!py-2.5 sm:!py-3 text-sm"
                  >
                    {loading ? "Sending..." : "Send reset code"}
                  </Button>
                ) : (
                  <div className="space-y-1.5">
                    <Button
                      fullWidth
                      size="sm"
                      onClick={submitForgotPassword}
                      disabled={loading}
                      className="!py-2.5 sm:!py-3 text-sm"
                    >
                      {loading ? "Saving..." : "Save new password"}
                    </Button>
                    <button
                      type="button"
                      onClick={sendForgotOtp}
                      disabled={loading || forgotResendIn > 0}
                      className="w-full text-[11px] sm:text-xs text-[var(--primary)] disabled:text-gray-400 py-0.5"
                    >
                      {forgotResendIn > 0 ? `Resend OTP in ${forgotResendIn}s` : "Resend OTP"}
                    </button>
                  </div>
                )
              ) : loginMode === "otp" ? (
                !otpSent ? (
                  <Button
                    fullWidth
                    size="sm"
                    onClick={sendLoginOtp}
                    disabled={loading}
                    className="!py-2.5 sm:!py-3 text-sm"
                  >
                    {loading ? "Sending OTP..." : "Send OTP"}
                  </Button>
                ) : (
                  <div className="space-y-1.5">
                    <Button
                      fullWidth
                      size="sm"
                      onClick={verifyLoginOtp}
                      disabled={loading}
                      className="!py-2.5 sm:!py-3 text-sm"
                    >
                      {loading ? "Verifying..." : "Verify & Sign In"}
                    </Button>
                    <button
                      type="button"
                      onClick={sendLoginOtp}
                      disabled={loading || resendIn > 0}
                      className="w-full text-[11px] sm:text-xs text-[var(--primary)] disabled:text-gray-400 py-0.5"
                    >
                      {resendIn > 0 ? `Resend OTP in ${resendIn}s` : "Resend OTP"}
                    </button>
                  </div>
                )
              ) : (
                <Button
                  fullWidth
                  size="sm"
                  onClick={doPasswordLogin}
                  disabled={loading}
                  className="!py-2.5 sm:!py-3 text-sm"
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              )
            ) : signupStep === 1 ? (
              <Button
                fullWidth
                size="sm"
                onClick={sendSignupOtp}
                disabled={loading}
                className="!py-2.5 sm:!py-3 text-sm"
              >
                {loading ? "Sending OTP..." : "Continue"}
              </Button>
            ) : (
              <div className="space-y-1.5">
                <Button
                  fullWidth
                  size="sm"
                  onClick={verifySignupOtp}
                  disabled={loading}
                  className="!py-2.5 sm:!py-3 text-sm"
                >
                  {loading ? "Verifying..." : "Verify & Create Account"}
                </Button>
                <button
                  type="button"
                  onClick={sendSignupOtp}
                  disabled={loading || resendIn > 0}
                  className="w-full text-[11px] sm:text-xs text-[var(--primary)] disabled:text-gray-400 py-0.5"
                >
                  {resendIn > 0 ? `Resend OTP in ${resendIn}s` : "Resend OTP"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

