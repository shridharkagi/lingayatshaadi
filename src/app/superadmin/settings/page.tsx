"use client";

import { useState, useEffect } from "react";
import { useAppConfig } from "@/contexts/AppConfigContext";
import { adminFetch } from "@/lib/api/adminClient";

export default function SuperAdminSettingsPage() {
  const { config, updateConfig } = useAppConfig();
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [whatsappContact, setWhatsappContact] = useState("");
  const [callContact, setCallContact] = useState("");
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [externalScripts, setExternalScripts] = useState("");
  const [robotsTxt, setRobotsTxt] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoKeywords, setSeoKeywords] = useState("");
  const [bridesHeroImageUrl, setBridesHeroImageUrl] = useState("");
  const [groomsHeroImageUrl, setGroomsHeroImageUrl] = useState("");
  const [savingSeo, setSavingSeo] = useState(false);

  useEffect(() => {
    setWhatsappUrl(config.whatsappGroupUrl || "");
  }, [config.whatsappGroupUrl]);

  useEffect(() => {
    setWhatsappContact(config.whatsappContactNumber || "");
  }, [config.whatsappContactNumber]);

  useEffect(() => {
    setCallContact(config.callContactNumber || "");
  }, [config.callContactNumber]);

  useEffect(() => {
    setWhatsappMessage(config.whatsappDefaultMessage ?? "I need assistance, my name: ");
  }, [config.whatsappDefaultMessage]);

  useEffect(() => {
    setFaviconUrl(config.faviconUrl || "");
  }, [config.faviconUrl]);

  useEffect(() => {
    setExternalScripts(config.externalScripts || "");
  }, [config.externalScripts]);

  useEffect(() => {
    setBridesHeroImageUrl(config.bridesHeroImageUrl || "");
  }, [config.bridesHeroImageUrl]);

  useEffect(() => {
    setGroomsHeroImageUrl(config.groomsHeroImageUrl || "");
  }, [config.groomsHeroImageUrl]);

  useEffect(() => {
    adminFetch("/api/site-config")
      .then((r) => r.json())
      .then((data) => {
        setRobotsTxt(data.robotsTxt || "User-agent: *\nAllow: /");
        setSeoDescription(data.seoDescription || "");
        setSeoKeywords(data.seoKeywords || "");
      })
      .catch(() => {});
  }, []);

  const handleSave = () => {
    updateConfig({
      whatsappGroupUrl: whatsappUrl,
      whatsappContactNumber: whatsappContact,
      callContactNumber: callContact,
      whatsappDefaultMessage: whatsappMessage,
      faviconUrl,
      externalScripts,
      bridesHeroImageUrl,
      groomsHeroImageUrl,
    });
    alert("Settings saved!");
  };

  const handleSaveSeo = async () => {
    setSavingSeo(true);
    try {
      const res = await adminFetch("/api/site-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ robotsTxt, seoDescription, seoKeywords }),
      });
      if (res.ok) alert("SEO & robots.txt saved!");
      else alert("Failed to save. Check server logs.");
    } catch {
      alert("Failed to save.");
    } finally {
      setSavingSeo(false);
    }
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
          <input type="email" defaultValue="LingayatShaadi@gmail.com" className="mt-1 w-full px-4 py-2 border rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Contact – Call Number</label>
          <p className="text-xs text-gray-500 mt-0.5 mb-1">
            Number for the floating contact button &quot;Call Us&quot; (e.g. 6360130905)
          </p>
          <input
            type="text"
            value={callContact}
            onChange={(e) => setCallContact(e.target.value)}
            placeholder="6360130905"
            className="mt-1 w-full px-4 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Contact – WhatsApp Number</label>
          <p className="text-xs text-gray-500 mt-0.5 mb-1">
            Number for the floating contact button &quot;WhatsApp Us&quot; (e.g. 6360130905)
          </p>
          <input
            type="text"
            value={whatsappContact}
            onChange={(e) => setWhatsappContact(e.target.value)}
            placeholder="6360130905"
            className="mt-1 w-full px-4 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">WhatsApp – Default Message</label>
          <p className="text-xs text-gray-500 mt-0.5 mb-1">
            Pre-filled message when user taps &quot;WhatsApp Us&quot; (e.g. I need assistance, my name: )
          </p>
          <input
            type="text"
            value={whatsappMessage}
            onChange={(e) => setWhatsappMessage(e.target.value)}
            placeholder="I need assistance, my name: "
            className="mt-1 w-full px-4 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Join WhatsApp Group URL</label>
          <p className="text-xs text-gray-500 mt-0.5 mb-1">
            Link for &quot;Join WhatsApp Group&quot; in contact popup and profile page (e.g. https://chat.whatsapp.com/xxxxx)
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

        <hr className="my-6 border-gray-200" />

        <h3 className="text-lg font-semibold text-gray-900">Favicon</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700">Favicon URL</label>
          <p className="text-xs text-gray-500 mt-0.5 mb-1">
            URL to your favicon image (e.g. https://yoursite.com/favicon.ico). Leave empty to use default.
          </p>
          <input
            type="url"
            value={faviconUrl}
            onChange={(e) => setFaviconUrl(e.target.value)}
            placeholder="https://example.com/favicon.ico"
            className="mt-1 w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <hr className="my-6 border-gray-200" />

        <h3 className="text-lg font-semibold text-gray-900">External Scripts</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700">Chatbot / Analytics Scripts</label>
          <p className="text-xs text-gray-500 mt-0.5 mb-1">
            Paste full script tags (e.g. Google Analytics, chatbot widget) or script URLs. One per line for multiple URLs.
          </p>
          <textarea
            value={externalScripts}
            onChange={(e) => setExternalScripts(e.target.value)}
            placeholder={'<script src="https://..."></script>\n<!-- or paste script URL -->'}
            rows={6}
            className="mt-1 w-full px-4 py-2 border rounded-lg font-mono text-sm"
          />
        </div>

        <hr className="my-6 border-gray-200" />

        <h3 className="text-lg font-semibold text-gray-900">Listing Hero Images</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700">Brides Page Hero Image URL</label>
          <p className="text-xs text-gray-500 mt-0.5 mb-1">
            South Indian traditional wedding image for /brides page.
          </p>
          <input
            type="url"
            value={bridesHeroImageUrl}
            onChange={(e) => setBridesHeroImageUrl(e.target.value)}
            placeholder="https://..."
            className="mt-1 w-full px-4 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Grooms Page Hero Image URL</label>
          <p className="text-xs text-gray-500 mt-0.5 mb-1">
            South Indian traditional wedding image for /grooms page.
          </p>
          <input
            type="url"
            value={groomsHeroImageUrl}
            onChange={(e) => setGroomsHeroImageUrl(e.target.value)}
            placeholder="https://..."
            className="mt-1 w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <button
          onClick={handleSave}
          className="px-6 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] transition"
        >
          Save Contact & Favicon & Scripts
        </button>
      </div>

      <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900">SEO & robots.txt</h2>
        <p className="text-gray-500 mt-1 text-sm">Edit robots.txt and SEO meta. Saved to server.</p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">robots.txt</label>
            <p className="text-xs text-gray-500 mt-0.5 mb-1">
              Controls crawler access. Example: User-agent: *\nAllow: /\nDisallow: /admin
            </p>
            <textarea
              value={robotsTxt}
              onChange={(e) => setRobotsTxt(e.target.value)}
              rows={6}
              className="mt-1 w-full px-4 py-2 border rounded-lg font-mono text-sm"
              spellCheck={false}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">SEO Meta Description</label>
            <input
              type="text"
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              placeholder="Premium matrimonial platform for the Lingayat community"
              className="mt-1 w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">SEO Meta Keywords</label>
            <input
              type="text"
              value={seoKeywords}
              onChange={(e) => setSeoKeywords(e.target.value)}
              placeholder="Lingayat matrimony, Lingayat shaadi"
              className="mt-1 w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <button
            onClick={handleSaveSeo}
            disabled={savingSeo}
            className="px-6 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] transition disabled:opacity-50"
          >
            {savingSeo ? "Saving..." : "Save SEO & robots.txt"}
          </button>
        </div>
      </div>
    </div>
  );
}
