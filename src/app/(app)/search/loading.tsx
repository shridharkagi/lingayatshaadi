import { ProfileCardSkeletonGrid } from "@/components/ui/ProfileCardSkeleton";

export default function SearchLoading() {
  return (
    <div className="max-w-6xl mx-auto w-full pb-6">
      {/* Header Skeleton */}
      <header className="bg-white border-b border-[var(--border)] px-4 py-4 sticky top-0 z-10 animate-pulse">
        <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
        <div className="flex gap-2">
          <div className="flex-1 h-10 bg-gray-100 rounded-xl" />
          <div className="w-24 h-10 bg-gray-100 rounded-xl" />
          <div className="w-12 h-10 bg-gray-100 rounded-xl" />
        </div>
      </header>

      <div className="p-4">
        <div className="h-4 w-48 bg-gray-200 rounded mb-4 animate-pulse" />
        <ProfileCardSkeletonGrid count={12} />
      </div>
    </div>
  );
}
