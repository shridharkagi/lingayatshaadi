"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone, Users2, X } from "lucide-react";
import { useAppConfig } from "@/contexts/AppConfigContext";
import { WhatsAppBrandIcon } from "@/components/icons/WhatsAppBrandIcon";

export function ContactFloat() {
  const { config } = useAppConfig();
  const pathname = usePathname();
  const [popupOpen, setPopupOpen] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState("");

  const hasCall = !!config.callContactNumber?.trim();
  const hasWhatsApp = !!config.whatsappContactNumber?.trim();
  const hasWhatsAppGroup = !!config.whatsappGroupUrl?.trim();

  // Hide on message/chat pages to avoid overlapping with message input
  const isMessagePage = pathname && pathname.startsWith("/messages/");
  const shouldHide = (!hasCall && !hasWhatsApp && !hasWhatsAppGroup) || Boolean(isMessagePage);

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

  // Native DOM event delegation - works around Turbopack breaking React onClick in dev
  useEffect(() => {
    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.closest("#contact-float-btn")) {
        e.preventDefault();
        setPopupOpen(true);
      } else if (target.closest("#contact-float-close")) {
        e.preventDefault();
        setPopupOpen(false);
      } else if (target.closest("#contact-float-backdrop") && !target.closest("[data-contact-popup-content]")) {
        e.preventDefault();
        setPopupOpen(false);
      }
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  if (shouldHide) return null;

  return (
    <>
      <button
        type="button"
        id="contact-float-btn"
        onClick={() => setPopupOpen(true)}
        className="fixed bottom-24 right-4 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-[var(--primary)] text-white shadow-lg hover:scale-105 active:scale-95 transition-transform lg:bottom-6 lg:right-6 cursor-pointer touch-manipulation"
        title="Contact us"
        aria-label="Contact us"
      >
        <Phone size={20} />
      </button>

      {popupOpen && (
        <div
          id="contact-float-backdrop"
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/40 sm:p-4"
          onClick={() => setPopupOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-popup-title"
        >
          <div
            data-contact-popup-content
            className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden mb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:mb-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
              <h2 id="contact-popup-title" className="text-lg font-semibold text-[var(--color-text-primary)]">
                Contact Us
              </h2>
              <button
                type="button"
                id="contact-float-close"
                onClick={() => setPopupOpen(false)}
                className="p-2 -m-2 rounded-lg hover:bg-[var(--color-border)]/50 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <p className="px-4 pt-3 pb-1 text-sm text-[var(--color-text-muted)] leading-snug">
              Need help with matches, memberships, or profile support? Contact our team now.
            </p>
            <div className="p-4 pt-2 flex flex-col gap-3">
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
                    <WhatsAppBrandIcon className="w-7 h-7" />
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
                    <p className="text-sm text-[var(--color-text-muted)] mt-0.5 truncate">Join our community (No spam)</p>
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
