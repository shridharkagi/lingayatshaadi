export function MessageSkeleton() {
  return (
    <div className="flex gap-4 p-4 bg-white rounded-2xl shadow-sm animate-pulse">
      <div className="relative w-14 h-14 rounded-full bg-gray-200 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="h-5 bg-gray-200 rounded w-1/3 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
      </div>
      <div className="h-3 w-12 bg-gray-200 rounded flex-shrink-0 mt-1" />
    </div>
  );
}

export function MessageListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <MessageSkeleton key={i} />
      ))}
    </div>
  );
}
