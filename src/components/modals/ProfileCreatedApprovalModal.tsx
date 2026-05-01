"use client";

import { CheckCircle2, PhoneCall, X } from "lucide-react";

interface ProfileCreatedApprovalModalProps {
  open: boolean;
  accountName: string;
  onClose: () => void;
}

const SUPPORT_PHONE = "6360130905";

export function ProfileCreatedApprovalModal({
  open,
  accountName,
  onClose,
}: ProfileCreatedApprovalModalProps) {
  if (!open) return null;

  const safeName = accountName.trim() || "User";
  const message = `My name is ${safeName}, Please approve my profile.`;
  const whatsappHref = `https://wa.me/91${SUPPORT_PHONE}?text=${encodeURIComponent(message)}`;
  const callHref = `tel:${SUPPORT_PHONE}`;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-created-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-2xl animate-[popupIn_180ms_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <style jsx>{`
          @keyframes popupIn {
            from { opacity: 0; transform: translateY(10px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>
        <div className="flex items-start justify-between gap-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <h2 id="profile-created-title" className="mt-3 text-xl font-semibold text-gray-900">
          Profile Created Successfully
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          Your profile has been created and is currently pending approval. Approval may take up to 24 hours.
          You can request approval or contact our support team for faster activation.
        </p>

        <div className="mt-5 flex flex-col gap-2.5">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95"
          >
            Request Approval
          </a>
          <a
            href={callHref}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            <PhoneCall size={16} />
            Call Support
          </a>
        </div>
      </div>
    </div>
  );
}
