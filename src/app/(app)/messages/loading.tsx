import { MessageListSkeleton } from "@/components/ui/MessageSkeleton";

export default function MessagesLoading() {
  return (
    <div className="max-w-lg mx-auto pb-6">
      <header className="bg-white border-b border-[var(--border)] px-4 py-4 animate-pulse">
        <div className="h-7 w-32 bg-gray-200 rounded" />
      </header>

      <div className="p-4">
        <MessageListSkeleton />
      </div>
    </div>
  );
}
