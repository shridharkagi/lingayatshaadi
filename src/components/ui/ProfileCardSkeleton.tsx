export function ProfileCardSkeleton({ variant = "card" }: { variant?: "card" | "list" }) {
  return (
    <div className="bg-white rounded-[10px] overflow-hidden shadow-[var(--shadow-soft)] border border-[var(--color-border)] animate-pulse">
      {/* Mobile / List: horizontal layout */}
      <div className={`flex flex-row ${variant === "list" ? "" : "lg:hidden"}`}>
        <div className="relative w-28 min-w-[9rem] aspect-[3/4] bg-gray-200 flex-shrink-0" />
        <div className="flex-1 min-w-0 p-4 flex flex-col justify-between">
          <div>
            <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
          <div className="h-9 bg-gray-200 rounded-lg w-32 mt-3" />
        </div>
      </div>

      {/* Desktop card: vertical */}
      <div className={variant === "list" ? "hidden" : "hidden lg:block"}>
        <div className="relative aspect-[3/4] bg-gray-200" />
        <div className="p-4">
          <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-4" />
          <div className="h-10 bg-gray-200 rounded-lg w-full" />
        </div>
      </div>
    </div>
  );
}

export function ProfileCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProfileCardSkeleton key={i} />
      ))}
    </div>
  );
}
