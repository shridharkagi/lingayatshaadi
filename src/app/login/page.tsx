"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email?.trim()) {
      setError("Please enter your email");
      return;
    }
    // Accept any credentials for demo - no password validation
    login(email.trim(), password || "demo");
    router.push("/home");
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col p-6">
      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
        <Link href="/" className="flex items-center gap-2 mb-8">
          <Heart className="w-8 h-8 text-[var(--primary)] fill-[var(--primary)]" />
          <span className="text-xl font-bold text-[var(--primary)]">LingayatShaadi</span>
        </Link>
        <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">Welcome back</h1>
        <p className="text-gray-600 mb-8">Sign in to continue your journey</p>
        <form onSubmit={handleSubmit} className="space-y-4">
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
        <p className="text-center text-gray-600 mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-[var(--primary)] font-semibold">
            Create Account
          </Link>
        </p>
        <p className="text-center text-gray-500 text-sm mt-4">
          <Link href="/superadmin" className="text-gray-400 hover:text-[var(--primary)]">
            Super Admin →
          </Link>
        </p>
      </div>
    </div>
  );
}
