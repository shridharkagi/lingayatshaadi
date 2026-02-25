import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const base = "rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-[var(--primary)] text-white hover:bg-[var(--primary-light)] active:scale-[0.98]",
    secondary: "bg-[var(--accent)] text-white hover:bg-[var(--accent-light)] active:scale-[0.98]",
    outline: "border-2 border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white",
    ghost: "text-[var(--primary)] hover:bg-[var(--primary)]/10",
  };
  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
