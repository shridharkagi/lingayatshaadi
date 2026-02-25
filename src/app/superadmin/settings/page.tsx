"use client";

import { useState, useEffect } from "react";
import { useAppConfig } from "@/contexts/AppConfigContext";

export default function SuperAdminSettingsPage() {
  const { config, updateConfig } = useAppConfig();
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [whatsappContact, setWhatsappContact] = useState("");
  const [callContact, setCallContact] = useState("");

  useEffect(() => {
    setWhatsappUrl(config.whatsappGroupUrl || "");
  }, [config.whatsappGroupUrl]);

  useEffect(() => {
    setWhatsappContact(config.whatsappContactNumber || "");
  }, [config.whatsappContactNumber]);

  useEffect(() => {
    setCallContact(config.callContactNumber || "");
  }, [config.callContactNumber]);

  const handleSave = () => {
    updateConfig({
      whatsappGroupUrl: whatsappUrl,
      whatsappContactNumber: whatsappContact,
      callContactNumber: callContact,
    });
    alert("Settings saved!");
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      <p className="text-gray-500 mt-1">Platform configuration</p>
      <div className="mt-6 bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Site Name</label>
          <input type="text" defaultValue="LingayatShaadi" className="mt-1 w-full px-4 py-2 border rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Support Email</label>
          <input type="email" defaultValue="support@lingayatshaadi.com" className="mt-1 w-full px-4 py-2 border rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Contact – WhatsApp Number</label>
          <p className="text-xs text-gray-500 mt-0.5 mb-1">
            Number for users to reach via WhatsApp (e.g. 919876543210)
          </p>
          <input
            type="text"
            value={whatsappContact}
            onChange={(e) => setWhatsappContact(e.target.value)}
            placeholder="919876543210"
            className="mt-1 w-full px-4 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Contact – Call Number</label>
          <p className="text-xs text-gray-500 mt-0.5 mb-1">
            Number for users to call (e.g. +91 9876543210)
          </p>
          <input
            type="text"
            value={callContact}
            onChange={(e) => setCallContact(e.target.value)}
            placeholder="+91 9876543210"
            className="mt-1 w-full px-4 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Join WhatsApp Group URL</label>
          <p className="text-xs text-gray-500 mt-0.5 mb-1">
            Link shown on profile page (e.g. https://chat.whatsapp.com/xxxxx)
          </p>
          <input
            type="url"
            value={whatsappUrl}
            onChange={(e) => setWhatsappUrl(e.target.value)}
            placeholder="https://chat.whatsapp.com/..."
            className="mt-1 w-full px-4 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">New User Approval</label>
          <select className="mt-1 w-full px-4 py-2 border rounded-lg">
            <option>Auto-approve</option>
            <option>Manual review</option>
          </select>
        </div>
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] transition"
        >
          Save
        </button>
      </div>
    </div>
  );
}
