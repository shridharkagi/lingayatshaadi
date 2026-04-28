export function ProfileCardSkeleton({ variant = "card" }: { variant?: "card" | "list" }) {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-[var(--shadow-soft)] border border-[var(--color-border)] animate-pulse">
      {/* Mobile / List: horizontal layout */}
      <div className={`flex flex-row ${variant === "list" ? "" : "lg:hidden"}`}>
        <div className="relative w-[35%] min-w-[35%] max-w-[180px] aspect-[3/4] bg-gray-200 flex-shrink-0" />
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
        <div className="relative aspect-[4/5] bg-gray-200" />
        <div className="p-3.5">
          <div className="h-4.5 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-3.5 bg-gray-200 rounded w-1/2 mb-2.5" />
          <div className="h-3.5 bg-gray-200 rounded w-2/3 mb-3" />
          <div className="h-8.5 bg-gray-200 rounded-md w-28" />
        </div>
      </div>
    </div>
  );
}

export function ProfileCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <ProfileCardSkeleton key={i} />
      ))}
    </div>
  );
}
