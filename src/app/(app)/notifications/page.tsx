"use client";

import Link from "next/link";
import { mockNotifications } from "@/data/mock";

export default function NotificationsPage() {
  return (
    <div className="max-w-lg mx-auto">
      <header className="bg-white border-b border-[var(--border)] px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--foreground)]">Notifications</h1>
        <Link href="/settings/notifications" className="text-sm text-[var(--primary)] font-medium">
          Settings
        </Link>
      </header>

      <div className="p-4">
        {mockNotifications.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {mockNotifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 rounded-2xl ${n.read ? "bg-gray-50" : "bg-[var(--primary)]/5"}`}
              >
                <h4 className="font-semibold text-[var(--foreground)]">{n.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{n.message}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
