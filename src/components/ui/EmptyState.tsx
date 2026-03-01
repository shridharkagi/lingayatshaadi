import { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "./Button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  illustration?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action, illustration }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      {illustration ? (
        <div className="mb-6">{illustration}</div>
      ) : (
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-6">
          <Icon size={40} className="text-gray-400" strokeWidth={1.5} />
        </div>
      )}
      
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
        {title}
      </h3>
      
      {description && (
        <p className="text-sm text-[var(--color-text-muted)] max-w-sm mb-6">
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
