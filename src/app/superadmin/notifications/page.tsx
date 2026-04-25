"use client";

import { useState } from "react";
import { adminFetch } from "@/lib/api/adminClient";

export default function SuperAdminNotificationsPage() {
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const send = async () => {
    setStatus(null);
    const res = await adminFetch("/api/notifications/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, type: "admin_broadcast", title, message }),
    });
    const json = (await res.json()) as { error?: string };
    setStatus(res.ok ? "Notification sent." : json.error || "Failed to send");
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
      <p className="text-gray-500 mt-1">Send targeted notifications with admin audit coverage</p>
      <div className="mt-6 bg-white rounded-xl shadow-sm p-8">
        <input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="w-full p-3 border rounded-lg mb-3"
          placeholder="Recipient userId"
        />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-3 border rounded-lg mb-3"
          placeholder="Notification title"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full p-4 border rounded-lg"
          placeholder="Compose notification..."
          rows={4}
        />
        <button onClick={send} className="mt-4 px-6 py-2 bg-[var(--primary)] text-white rounded-lg">Send</button>
        {status && <p className="mt-3 text-sm text-gray-600">{status}</p>}
      </div>
    </div>
  );
}
