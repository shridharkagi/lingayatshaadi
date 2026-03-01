"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Heart, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";

// TODO: Connect to Supabase Auth (signInWithPassword, signInWithOtp)
type LoginMode = "email" | "otp";

const LOGIN_IMAGE =
  "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=800&q=80";

export default function LoginPage() {
  const router = useRouter();
  const { login: loginUser } = useAuth();
  const [mode, setMode] = useState<LoginMode>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email?.trim()) {
      setError("Please enter your email");
      return;
    }
    loginUser(email.trim(), password || "demo");
    router.push("/home");
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!mobile?.trim() || mobile.replace(/\D/g, "").length < 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }
    setOtpSent(true);
    setOtp("");
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!otp || otp.length !== 6) {
      setError("Please enter 6-digit OTP");
      return;
    }
    loginUser(`+91${mobile.replace(/\D/g, "")}@otp.demo`, "otp");
    router.push("/home");
  };

  const switchMode = (newMode: LoginMode) => {
    setMode(newMode);
    setError("");
    setOtpSent(false);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      {/* Header with Hamburger */}
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
        {/* Image Section */}
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

        {/* Form Section */}
        <div className="lg:w-1/2 flex flex-col justify-center p-6 lg:p-12">
          <div className="max-w-md mx-auto w-full">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
              Welcome back
            </h1>
            <p className="text-[var(--color-text-muted)] mb-6">
              Sign in to continue your journey
            </p>

            {/* Tab buttons - ensure they switch mode */}
            <div
              role="tablist"
              aria-label="Login method"
              className="flex gap-2 mb-6 p-1 bg-[var(--color-border)]/50 rounded-xl shadow-sm"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === "email"}
                aria-controls="email-panel"
                id="email-tab"
                onClick={() => switchMode("email")}
                className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${
                  mode === "email"
                    ? "bg-[var(--primary)] text-white shadow-md"
                    : "bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                Email
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "otp"}
                aria-controls="otp-panel"
                id="otp-tab"
                onClick={() => switchMode("otp")}
                className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${
                  mode === "otp"
                    ? "bg-[var(--primary)] text-white shadow-md"
                    : "bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                Mobile OTP
              </button>
            </div>

            {/* Form content - key forces fresh render on mode change */}
            {mode === "email" ? (
              <form
                key="email-form"
                onSubmit={handleEmailSubmit}
                className="space-y-4"
                id="email-panel"
                role="tabpanel"
                aria-labelledby="email-tab"
              >
                <Input
                  label="Email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  label="Password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <Button type="submit" fullWidth size="lg">
                  Sign In
                </Button>
              </form>
            ) : (
              <form
                key="otp-form"
                onSubmit={otpSent ? handleOtpSubmit : handleSendOtp}
                className="space-y-4"
                id="otp-panel"
                role="tabpanel"
                aria-labelledby="otp-tab"
              >
                {!otpSent ? (
                  <>
                    <Input
                      label="Mobile Number"
                      type="tel"
                      placeholder="Enter 10-digit mobile number"
                      value={mobile}
                      onChange={(e) =>
                        setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
                      }
                      maxLength={10}
                    />
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <Button type="submit" fullWidth size="lg">
                      Send OTP
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      OTP sent to +91 {mobile}
                    </p>
                    <Input
                      label="Enter OTP"
                      placeholder="Enter 6-digit code"
                      value={otp}
                      onChange={(e) =>
                        setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      maxLength={6}
                    />
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <Button type="submit" fullWidth size="lg">
                      Verify & Sign In
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setOtp("");
                        setError("");
                      }}
                      className="w-full text-sm text-[var(--primary)] font-medium py-2"
                    >
                      Change number
                    </button>
                  </>
                )}
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
