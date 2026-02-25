"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Shield, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

const slides = [
  {
    icon: Heart,
    title: "Find Your Match",
    description: "Connect with verified profiles from the Lingayat community. Your perfect partner is just a swipe away.",
    color: "bg-blue-500",
  },
  {
    icon: Shield,
    title: "Safe & Secure",
    description: "Verified profiles and privacy-first design. Your data and preferences are always protected.",
    color: "bg-emerald-500",
  },
  {
    icon: Users,
    title: "Community First",
    description: "Built for the Lingayat community. Respect traditions while embracing modern matchmaking.",
    color: "bg-amber-500",
  },
  {
    icon: Sparkles,
    title: "Start Your Journey",
    description: "Create your profile and let us help you find a life partner who shares your values.",
    color: "bg-rose-500",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);

  const goToLogin = () => {
    sessionStorage.setItem("lingayat_visited", "true");
    router.push("/login");
  };

  const next = () => {
    if (current < slides.length - 1) setCurrent(current + 1);
    else goToLogin();
  };

  const skip = () => goToLogin();

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-6 pt-12">
        <div className={`w-20 h-20 rounded-2xl ${slides[current].color} flex items-center justify-center mb-8`}>
          {(() => {
            const Icon = slides[current].icon;
            return <Icon className="w-10 h-10 text-white" />;
          })()}
        </div>
        <h2 className="text-2xl font-bold text-[var(--foreground)] text-center mb-3">
          {slides[current].title}
        </h2>
        <p className="text-gray-600 text-center max-w-sm mb-8">
          {slides[current].description}
        </p>
        <div className="flex gap-2 mb-12">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === current ? "bg-[var(--primary)] w-6" : "bg-gray-300"
              }`}
            />
          ))}
        </div>
      </div>
      <div className="p-6 pb-10 space-y-3">
        <Button fullWidth size="lg" onClick={next}>
          {current === slides.length - 1 ? "Create Account" : "Continue"}
        </Button>
        <button
          onClick={skip}
          className="w-full py-3 text-gray-500 text-sm font-medium"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
