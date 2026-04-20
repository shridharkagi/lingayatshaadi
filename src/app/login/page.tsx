"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Heart, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";

const LOGIN_IMAGE =
  "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=800&q=80";

type LoginMode = "otp" | "password";

export default function LoginPage() {
  const router = useRouter();
  const {
    sendPhoneOtp,
    verifyPhoneOtp,
    signInWithPassword,
    resetPasswordWithPhoneOtp,
    isLoggedIn,
    profileComplete,
    loading: authLoading,
  } = useAuth();
  const [loginMode, setLoginMode] = useState<LoginMode>("otp");
  const [mobile, setMobile] = useState("");
  const [passwordId, setPasswordId] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [passwordForgot, setPasswordForgot] = useState(false);
  const [forgotOtpSent, setForgotOtpSent] = useState(false);
  const [forgotMobile, setForgotMobile] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotPw1, setForgotPw1] = useState("");
  const [forgotPw2, setForgotPw2] = useState("");
  const [forgotResendIn, setForgotResendIn] = useState(0);

  useEffect(() => {
    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.closest('[aria-label="Open menu"], [aria-label="Close menu"]')) {
        e.preventDefault();
        setMenuOpen((prev) => !prev);
      }
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) return;
    router.replace(profileComplete ? "/home" : "/profile/complete");
  }, [authLoading, isLoggedIn, profileComplete, router]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setInterval(() => {
      setResendIn((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendIn]);

  const phoneE164 = () => `+91${mobile.replace(/\D/g, "")}`;

  const redirectAfterLogin = () => {
    router.replace("/home");
    // Fallback for cases where client-side navigation stalls in dev (HMR compile).
    window.setTimeout(() => {
      if (window.location.pathname === "/login") {
        window.location.assign("/home");
      }
    }, 1200);
  };

  const switchMode = (mode: LoginMode) => {
    setLoginMode(mode);
    setError("");
    setInfo("");
    setSuccess("");
    setOtpSent(false);
    setOtp("");
    setResendIn(0);
    setPassword("");
    setPasswordForgot(false);
    setForgotOtpSent(false);
    setForgotMobile("");
    setForgotOtp("");
    setForgotPw1("");
    setForgotPw2("");
    setForgotResendIn(0);
    if (mode === "password") {
      setPasswordId((prev) => prev || mobile);
    }
  };

  const sendOtpRequest = async () => {
    if (loading) return;
    setError("");
    setInfo("");
    setSuccess("");
    if (!mobile?.trim() || mobile.replace(/\D/g, "").length !== 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    const result = await sendPhoneOtp(phoneE164(), "login");
    setLoading(false);

    if (result.error) {
      setError(result.error);
      if (result.retryAfter) setResendIn(result.retryAfter);
    } else {
      setOtpSent(true);
      const cooldown = result.cooldownSeconds ?? 30;
      setResendIn(cooldown);
      setInfo("OTP sent. It is valid for 10 minutes.");
    }
  };

  const handleSendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendOtpRequest();
  };

  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    if (!otp || otp.length !== 6) {
      setError("Please enter 6-digit OTP");
      return;
    }
    setInfo("");
    setLoading(true);
    const result = await verifyPhoneOtp(phoneE164(), otp);

    if (result.error) {
      setLoading(false);
      setError(result.error);
    } else {
      setSuccess("Verified successfully. Redirecting...");
      setLoading(false);
      redirectAfterLogin();
    }
  };

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const id = passwordId.trim();
    if (!id) {
      setError("Enter mobile number or email");
      return;
    }
    if (!id.includes("@")) {
      const d = id.replace(/\D/g, "");
      if (d.length !== 10) {
        setError("Enter a valid 10-digit mobile or email");
        return;
      }
    }
    if (!password) {
      setError("Please enter your password");
      return;
    }
    setLoading(true);
    const identifier = id.includes("@") ? id : `+91${id.replace(/\D/g, "").slice(-10)}`;
    const result = await signInWithPassword(identifier, password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      router.push("/profiles");
    }
  };

  const sendForgotOtp = async () => {
    if (loading) return;
    setError("");
    setInfo("");
    if (forgotMobile.replace(/\D/g, "").length !== 10) {
      setError("Enter the mobile number for your account");
      return;
    }
    setLoading(true);
    const result = await sendPhoneOtp(`+91${forgotMobile.replace(/\D/g, "").slice(-10)}`, "password_reset");
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

  const submitForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setInfo("");
    if (forgotOtp.length !== 6) {
      setError("Enter the 6-digit OTP");
      return;
    }
    if (!forgotPw1 || forgotPw1.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }
    if (forgotPw1 !== forgotPw2) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    const result = await resetPasswordWithPhoneOtp(
      `+91${forgotMobile.replace(/\D/g, "").slice(-10)}`,
      forgotOtp,
      forgotPw1
    );
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSuccess("Password updated. Redirecting...");
    redirectAfterLogin();
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      <header className="sticky top-0 z-50 bg-white border-b border-[var(--color-border)] shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/" className="flex items-center gap-2">
            <Heart className="w-7 h-7 text-[var(--primary)] fill-[var(--primary)]" />
            <span className="text-lg font-bold text-[var(--primary)]">
              LingayatShaadi
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-4">
            <Link
              href="/"
              className="text-[var(--color-text-muted)] hover:text-[var(--primary)] transition text-sm"
            >
              Home
            </Link>
            <Link
              href="/#help"
              className="text-[var(--color-text-muted)] hover:text-[var(--primary)] transition text-sm"
            >
              Help
            </Link>
            <Link href="/signup">
              <Button size="sm">Register</Button>
            </Link>
          </nav>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-[var(--color-border)] transition"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-[var(--color-border)] bg-white p-4 flex flex-col gap-3">
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              className="py-2 text-[var(--color-text-primary)] font-medium"
            >
              Home
            </Link>
            <Link
              href="/#help"
              onClick={() => setMenuOpen(false)}
              className="py-2 text-[var(--color-text-muted)]"
            >
              Help
            </Link>
            <Link href="/signup" onClick={() => setMenuOpen(false)}>
              <Button fullWidth>Register</Button>
            </Link>
          </div>
        )}
      </header>

      <div className="flex-1 flex flex-col lg:flex-row">
        <div className="lg:w-1/2 relative min-h-[200px] lg:min-h-[calc(100vh-3.5rem)]">
          <Image
            src={LOGIN_IMAGE}
            alt="Indian couple in traditional attire"
            fill
            className="object-cover"
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <p className="text-sm font-medium drop-shadow-md">
              Join lakhs of families who found their perfect match
            </p>
          </div>
        </div>

        <div className="lg:w-1/2 flex flex-col justify-center p-6 lg:p-12 relative z-10">
          <div className="max-w-md mx-auto w-full relative z-10">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
              Welcome back
            </h1>
            <p className="text-[var(--color-text-muted)] mb-4">
              Sign in with your mobile number — use a one-time code or your password
            </p>

            {!(loginMode === "password" && passwordForgot) && (
              <div
                role="tablist"
                aria-label="Sign in method"
                className="flex gap-1 mb-6 p-1 bg-[var(--color-border)]/50 rounded-xl"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={loginMode === "otp"}
                  onClick={() => switchMode("otp")}
                  className={`flex-1 py-3 sm:py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    loginMode === "otp"
                      ? "bg-[var(--primary)] text-white shadow-md"
                      : "text-[var(--color-text-muted)]"
                  }`}
                >
                  OTP
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={loginMode === "password"}
                  onClick={() => switchMode("password")}
                  className={`flex-1 py-3 sm:py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    loginMode === "password"
                      ? "bg-[var(--primary)] text-white shadow-md"
                      : "text-[var(--color-text-muted)]"
                  }`}
                >
                  Password
                </button>
              </div>
            )}

            {loginMode === "otp" ? (
              !otpSent ? (
                <form onSubmit={handleSendPhoneOtp} className="space-y-4" aria-label="OTP mobile">
                  <Input
                    label="Mobile Number"
                    type="tel"
                    placeholder="Enter 10-digit mobile number"
                    value={mobile}
                    onChange={(e) =>
                      setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
                    }
                    maxLength={10}
                    autoComplete="tel-national"
                  />
                  {error && <p className="text-red-500 text-sm">{error}</p>}
                  {info && <p className="text-blue-600 text-sm">{info}</p>}
                  <Button type="submit" fullWidth size="lg" disabled={loading}>
                    {loading ? "Sending OTP..." : "Send OTP"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyPhoneOtp} className="space-y-4" aria-label="Enter OTP">
                  <p className="text-sm text-[var(--color-text-muted)]">
                    OTP sent to +91 {mobile}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    OTP is valid for 10 minutes.
                  </p>
                  <Input
                    label="Enter OTP"
                    placeholder="Enter 6-digit code"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    maxLength={6}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  />
                  {error && <p className="text-red-500 text-sm">{error}</p>}
                  {info && <p className="text-blue-600 text-sm">{info}</p>}
                  {success && <p className="text-green-600 text-sm">{success}</p>}
                  <Button type="submit" fullWidth size="lg" disabled={loading}>
                    {loading ? "Verifying..." : "Verify & Sign In"}
                  </Button>
                  <button
                    type="button"
                    onClick={sendOtpRequest}
                    disabled={loading || resendIn > 0}
                    className="w-full text-sm text-[var(--primary)] font-medium py-1 disabled:text-[var(--color-text-muted)] disabled:cursor-not-allowed"
                  >
                    {resendIn > 0 ? `Resend OTP in ${resendIn}s` : "Resend OTP"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp("");
                      setError("");
                      setInfo("");
                      setSuccess("");
                      setResendIn(0);
                    }}
                    className="w-full text-sm text-[var(--primary)] font-medium py-2"
                  >
                    Change number
                  </button>
                </form>
              )
            ) : passwordForgot ? (
              forgotOtpSent ? (
                <form onSubmit={submitForgotPassword} className="space-y-4" aria-label="Set new password">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">Reset password</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Enter the code we sent to +91 {forgotMobile}, then choose a new password.
                  </p>
                  <Input
                    label="OTP"
                    placeholder="6-digit code"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    inputMode="numeric"
                  />
                  <Input
                    label="New password"
                    type="password"
                    placeholder="At least 8 characters"
                    value={forgotPw1}
                    onChange={(e) => setForgotPw1(e.target.value)}
                    autoComplete="new-password"
                  />
                  <Input
                    label="Confirm new password"
                    type="password"
                    value={forgotPw2}
                    onChange={(e) => setForgotPw2(e.target.value)}
                    autoComplete="new-password"
                  />
                  {error && <p className="text-red-500 text-sm">{error}</p>}
                  {info && <p className="text-blue-600 text-sm">{info}</p>}
                  {success && <p className="text-green-600 text-sm">{success}</p>}
                  <Button type="submit" fullWidth size="lg" disabled={loading}>
                    {loading ? "Saving..." : "Save new password"}
                  </Button>
                  <button
                    type="button"
                    onClick={sendForgotOtp}
                    disabled={loading || forgotResendIn > 0}
                    className="w-full text-sm text-[var(--primary)] font-medium py-1 disabled:text-[var(--color-text-muted)]"
                  >
                    {forgotResendIn > 0 ? `Resend OTP in ${forgotResendIn}s` : "Resend OTP"}
                  </button>
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
                    className="w-full text-sm text-[var(--primary)] font-medium py-2"
                  >
                    ← Back to sign in
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">Reset password</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    We&apos;ll send a code to your registered mobile number.
                  </p>
                  <Input
                    label="Mobile Number"
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={forgotMobile}
                    onChange={(e) =>
                      setForgotMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
                    }
                    maxLength={10}
                    autoComplete="tel-national"
                  />
                  {error && <p className="text-red-500 text-sm">{error}</p>}
                  {info && <p className="text-blue-600 text-sm">{info}</p>}
                  <Button type="button" fullWidth size="lg" disabled={loading} onClick={sendForgotOtp}>
                    {loading ? "Sending..." : "Send reset code"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordForgot(false);
                      setForgotMobile("");
                      setError("");
                      setInfo("");
                    }}
                    className="w-full text-sm text-[var(--primary)] font-medium py-2"
                  >
                    ← Back to sign in
                  </button>
                </div>
              )
            ) : (
              <form onSubmit={handlePasswordSignIn} className="space-y-4" aria-label="Password sign in">
                <Input
                  label="Mobile number or email"
                  type="text"
                  placeholder="10-digit mobile or your email"
                  value={passwordId}
                  onChange={(e) => setPasswordId(e.target.value)}
                  autoComplete="username"
                />
                <Input
                  label="Password"
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPasswordForgot(true);
                    setForgotOtpSent(false);
                    setForgotMobile(mobile || passwordId.replace(/\D/g, "").slice(-10) || "");
                    setForgotOtp("");
                    setForgotPw1("");
                    setForgotPw2("");
                    setError("");
                    setInfo("");
                  }}
                  className="text-sm text-[var(--primary)] font-medium -mt-2"
                >
                  Forgot password?
                </button>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <Button type="submit" fullWidth size="lg" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            )}

            <p className="text-center text-[var(--color-text-muted)] mt-6">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="text-[var(--primary)] font-semibold hover:underline"
              >
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
