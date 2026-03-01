import { ProfileCardSkeletonGrid } from "@/components/ui/ProfileCardSkeleton";

export default function HomeLoading() {
  return (
    <div className="w-full pb-6">
      {/* Header Skeleton */}
      <header className="bg-[var(--primary)] text-white px-4 py-6 lg:py-8 rounded-b-3xl animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="h-4 w-24 bg-white/20 rounded mb-2" />
            <div className="h-6 w-32 bg-white/30 rounded" />
          </div>
          <div className="flex gap-2">
            <div className="w-10 h-10 rounded-full bg-white/20" />
            <div className="w-10 h-10 rounded-full bg-white/20" />
          </div>
        </div>
        <div className="h-12 bg-white/20 rounded-xl" />
      </header>

      <div className="px-0 -mt-2 space-y-8">
        {/* Quick Actions Skeleton */}
        <div className="bg-white rounded-2xl shadow-sm p-4 lg:p-6 animate-pulse">
          <div className="h-5 w-32 bg-gray-200 rounded mb-3" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-xl" />
            ))}
          </div>
        </div>

        {/* Suggested Matches Skeleton */}
        <div>
          <div className="h-5 w-40 bg-gray-200 rounded mb-3 animate-pulse" />
          <ProfileCardSkeletonGrid />
        </div>
      </div>
    </div>
  );
}
