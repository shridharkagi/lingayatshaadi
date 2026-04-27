import { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "./Button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  compact?: boolean;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  illustration?: React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  compact = false,
  action,
  illustration,
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center px-4 ${compact ? "py-7" : "py-12"}`}>
      {illustration ? (
        <div className={compact ? "mb-4" : "mb-6"}>{illustration}</div>
      ) : (
        <div
          className={`${compact ? "w-14 h-14 mb-4" : "w-20 h-20 mb-6"} rounded-full bg-gray-100 flex items-center justify-center`}
        >
          <Icon size={compact ? 28 : 40} className="text-gray-400" strokeWidth={1.5} />
        </div>
      )}
      
      <h3 className={`${compact ? "text-base" : "text-lg"} font-semibold text-[var(--color-text-primary)] mb-2`}>
        {title}
      </h3>
      
      {description && (
        <p className={`text-sm text-[var(--color-text-muted)] max-w-sm ${compact ? "mb-4" : "mb-6"}`}>
          {description}
        </p>
      )}
      
      {action && (
        action.href ? (
          <Link href={action.href}>
            <Button>{action.label}</Button>
          </Link>
        ) : (
          <Button onClick={action.onClick}>{action.label}</Button>
        )
      )}
    </div>
  );
}
