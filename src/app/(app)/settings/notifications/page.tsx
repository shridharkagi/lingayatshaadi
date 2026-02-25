"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function NotificationSettingsPage() {
  const router = useRouter();

  return (
    <div className="max-w-lg mx-auto">
      <header className="bg-white border-b border-[var(--border)] px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-lg">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-semibold">Notification Settings</h1>
      </header>

      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-[var(--border)]">
          <div>
            <p className="font-medium">New Match Notifications</p>
            <p className="text-sm text-gray-500">Get notified when you have new matches</p>
          </div>
          <input type="checkbox" defaultChecked className="accent-[var(--primary)] w-5 h-5" />
        </div>
        <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-[var(--border)]">
          <div>
            <p className="font-medium">Message Notifications</p>
            <p className="text-sm text-gray-500">Get notified for new messages</p>
          </div>
          <input type="checkbox" defaultChecked className="accent-[var(--primary)] w-5 h-5" />
        </div>
        <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-[var(--border)]">
          <div>
            <p className="font-medium">Profile View Notifications</p>
            <p className="text-sm text-gray-500">Get notified when someone views your profile</p>
          </div>
          <input type="checkbox" defaultChecked className="accent-[var(--primary)] w-5 h-5" />
        </div>
        <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-[var(--border)]">
          <div>
            <p className="font-medium">Interest Notifications</p>
            <p className="text-sm text-gray-500">Get notified when someone sends you an interest</p>
          </div>
          <input type="checkbox" defaultChecked className="accent-[var(--primary)] w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
