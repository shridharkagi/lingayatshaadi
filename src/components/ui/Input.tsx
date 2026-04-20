import { InputHTMLAttributes, ReactNode, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  error?: string;
  /** Smaller label + spacing for dense forms (e.g. mobile auth modal) */
  compact?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, compact, className = "", ...props }, ref) => {
    const labelClass = compact
      ? "block text-xs sm:text-sm font-medium text-gray-700 mb-0.5 sm:mb-1"
      : "block text-sm font-medium text-gray-700 mb-1";
    return (
      <div className="w-full">
        {label && (
          <label className={labelClass}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full rounded-xl border border-[var(--border)] bg-white focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all ${
            compact
              ? "px-3 py-2 text-sm sm:px-4 sm:py-2.5 sm:text-base"
              : "px-4 py-3"
          } ${error ? "border-red-500" : ""} ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
