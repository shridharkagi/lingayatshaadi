"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { getNotifications, markNotificationRead } from "@/lib/api/notifications";

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; message: string; read: boolean; createdAt: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    getNotifications(user.id).then(({ data }) => {
      setNotifications(data || []);
      setLoading(false);
    });
  }, [user?.id]);

  const handleMarkAsRead = async (n: { id: string; read: boolean }) => {
    if (n.read) return;
    setNotifications((prev) =>
      prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
    );
    await markNotificationRead(n.id);
  };

  return (
    <div className="max-w-lg mx-auto">
      <header className="bg-white border-b border-[var(--border)] px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--foreground)]">Notifications</h1>
        <Link href="/settings/notifications" className="text-sm text-[var(--primary)] font-medium">
          Settings
        </Link>
      </header>

      <div className="p-4">
        {loading ? (
          <div className="text-center py-16">
            <p className="text-gray-500">Loading...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleMarkAsRead(n)}
                className={`w-full text-left p-4 rounded-2xl transition-colors ${n.read ? "bg-gray-50" : "bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 active:bg-[var(--primary)]/15"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-[var(--foreground)]">{n.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="text-xs font-medium text-[var(--primary)] shrink-0">
                      Tap to mark read
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
