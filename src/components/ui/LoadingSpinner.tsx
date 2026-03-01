export function LoadingSpinner({ size = "md", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
  };

  return (
    <div
      className={`${sizeClasses[size]} border-[var(--primary)] border-t-transparent rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function LoadingScreen({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] p-4">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-[var(--color-text-muted)] text-sm">{message}</p>
    </div>
  );
}
