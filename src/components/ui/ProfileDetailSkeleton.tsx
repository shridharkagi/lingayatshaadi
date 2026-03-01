export function ProfileDetailSkeleton() {
  return (
    <div className="max-w-2xl mx-auto pb-6 animate-pulse">
      {/* Header */}
      <header className="sticky top-0 bg-white/95 backdrop-blur border-b border-[var(--border)] px-4 py-3 flex items-center justify-between z-10">
        <div className="h-10 w-20 bg-gray-200 rounded-lg" />
        <div className="h-10 w-10 bg-gray-200 rounded-lg" />
      </header>

      {/* Profile Image */}
      <div className="relative aspect-[4/5] lg:aspect-[16/9] max-h-[500px] bg-gray-200 rounded-[10px]" />

      {/* Action Buttons */}
      <div className="p-4">
        <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2 sm:gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-[44px] bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>

      {/* Profile Details */}
      <div className="px-0 space-y-4">
        {/* About Me */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-3" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
          </div>
        </div>

        {/* Profile Details Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
