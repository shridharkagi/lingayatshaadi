"use client";

import { useState, useEffect } from "react";
import { Phone, MessageCircle, Users2, X } from "lucide-react";
import { useAppConfig } from "@/contexts/AppConfigContext";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function ContactFloat() {
  const { config } = useAppConfig();
  const pathname = usePathname();
  const [popupOpen, setPopupOpen] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState("");

  const hasCall = !!config.callContactNumber?.trim();
  const hasWhatsApp = !!config.whatsappContactNumber?.trim();
  const hasWhatsAppGroup = !!config.whatsappGroupUrl?.trim();

  if (!hasCall && !hasWhatsApp && !hasWhatsAppGroup) return null;

  const whatsappNumber = config.whatsappContactNumber?.replace(/\D/g, "");

  // Update WhatsApp URL based on current page
  useEffect(() => {
    if (!whatsappNumber) return;

    let message = "";
    const currentUrl = typeof window !== "undefined" ? window.location.href : "";

    // Check if we're on a profile page
    if (pathname && pathname.startsWith("/profile/") && pathname !== "/profile/complete") {
      message = `I need more information about the profile ${currentUrl}.\n\nMy name is: `;
    } else {
      message = config.whatsappDefaultMessage || "I need assistance, my name: ";
    }

    setWhatsappUrl(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`);
  }, [pathname, whatsappNumber, config.whatsappDefaultMessage]);

  return (
    <>
      <button
        type="button"
        onClick={() => setPopupOpen(true)}
        className="fixed bottom-20 right-4 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-[var(--primary)] text-white shadow-lg hover:scale-105 active:scale-95 transition-transform lg:bottom-6 lg:right-6"
        title="Contact us"
        aria-label="Contact us"
      >
        <Phone size={24} />
      </button>

      {popupOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/40 sm:p-4"
          onClick={() => setPopupOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-popup-title"
        >
          <div
            className="w-full max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
              <h2 id="contact-popup-title" className="text-lg font-semibold text-[var(--color-text-primary)]">
                Contact Us
              </h2>
              <button
                type="button"
                onClick={() => setPopupOpen(false)}
                className="p-2 -m-2 rounded-lg hover:bg-[var(--color-border)]/50 transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 flex flex-col gap-3">
              {hasCall && (
                <Link
                  href={`tel:${config.callContactNumber}`}
                  onClick={() => setPopupOpen(false)}
                  className="flex items-center gap-3 p-4 rounded-xl bg-[var(--color-bg)] hover:bg-[var(--color-border)]/50 transition-colors border border-[var(--color-border)]/50"
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[var(--primary)] text-white flex-shrink-0">
                    <Phone size={22} />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="font-medium text-[var(--color-text-primary)]">Call Us</span>
                    <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{config.callContactNumber}</p>
                  </div>
                </Link>
              )}
              {hasWhatsApp && (
                <Link
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setPopupOpen(false)}
                  className="flex items-center gap-3 p-4 rounded-xl bg-[var(--color-bg)] hover:bg-[var(--color-border)]/50 transition-colors border border-[var(--color-border)]/50"
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#25D366] text-white flex-shrink-0">
                    <MessageCircle size={22} />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="font-medium text-[var(--color-text-primary)]">WhatsApp Us</span>
                    <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{config.whatsappContactNumber}</p>
                  </div>
                </Link>
              )}
              {hasWhatsAppGroup && (
                <Link
                  href={config.whatsappGroupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setPopupOpen(false)}
                  className="flex items-center gap-3 p-4 rounded-xl bg-[var(--color-bg)] hover:bg-[var(--color-border)]/50 transition-colors border border-[var(--color-border)]/50"
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#25D366] text-white flex-shrink-0">
                    <Users2 size={22} />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="font-medium text-[var(--color-text-primary)]">Join WhatsApp Group</span>
                    <p className="text-sm text-[var(--color-text-muted)] mt-0.5 truncate">Join our community</p>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
