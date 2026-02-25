"use client";

import { Phone, MessageCircle } from "lucide-react";
import { useAppConfig } from "@/contexts/AppConfigContext";
import Link from "next/link";

export function ContactFloat() {
  const { config } = useAppConfig();
  const hasCall = !!config.callContactNumber?.trim();
  const hasWhatsApp = !!config.whatsappContactNumber?.trim();

  if (!hasCall && !hasWhatsApp) return null;

  const callUrl = config.callContactNumber?.replace(/\D/g, "");
  const whatsappUrl = config.whatsappContactNumber?.replace(/\D/g, "");

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 lg:bottom-6 lg:right-6">
      {hasCall && (
        <Link
          href={`tel:${config.callContactNumber}`}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-[var(--primary)] text-white shadow-lg hover:scale-105 transition-transform"
          title="Call us"
          aria-label="Call us"
        >
          <Phone size={22} />
        </Link>
      )}
      {hasWhatsApp && (
        <Link
          href={`https://wa.me/${whatsappUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-12 h-12 rounded-full bg-[#25D366] text-white shadow-lg hover:scale-105 transition-transform"
          title="WhatsApp us"
          aria-label="WhatsApp us"
        >
          <MessageCircle size={22} />
        </Link>
      )}
    </div>
  );
}
