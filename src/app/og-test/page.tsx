"use client";

import { useState } from "react";

export default function OGTestPage() {
  const [url, setUrl] = useState("https://test.ligayatshaadi.in");
  const [loading, setLoading] = useState(false);

  const testOGTags = () => {
    setLoading(true);
    // Open in new tab for testing
    window.open(`https://www.opengraph.xyz/url/${encodeURIComponent(url)}`, "_blank");
    setLoading(false);
  };

  const testWithDebugger = () => {
    window.open(`https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(url)}`, "_blank");
  };

  const testWithTwitter = () => {
    window.open(`https://cards-dev.twitter.com/validator`, "_blank");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Open Graph Image Tester
          </h1>
          <p className="text-gray-600 mb-8">
            Test if your OG images and meta tags are working correctly
          </p>

          <div className="space-y-6">
            {/* URL Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter URL to Test
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://test.ligayatshaadi.in"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Test Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={testOGTags}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Test with OpenGraph.xyz
              </button>
              <button
                onClick={testWithDebugger}
                className="px-6 py-3 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition"
              >
                Facebook Debugger
              </button>
              <button
                onClick={testWithTwitter}
                className="px-6 py-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition"
              >
                Twitter Validator
              </button>
            </div>

            {/* Current Page Meta Tags */}
            <div className="mt-8 border-t pt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Current Page Meta Tags
              </h2>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <MetaTag name="og:title" />
                <MetaTag name="og:description" />
                <MetaTag name="og:image" />
                <MetaTag name="og:url" />
                <MetaTag name="og:type" />
                <MetaTag name="twitter:card" />
                <MetaTag name="twitter:title" />
                <MetaTag name="twitter:description" />
                <MetaTag name="twitter:image" />
              </div>
            </div>

            {/* Quick Test URLs */}
            <div className="mt-8 border-t pt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Quick Test
              </h2>
              <div className="space-y-2">
                <TestUrlButton url="https://test.ligayatshaadi.in" label="Homepage" />
                <TestUrlButton url="https://test.ligayatshaadi.in/profiles" label="Profiles Page" />
                <TestUrlButton url="https://test.ligayatshaadi.in/profile/example-id" label="Profile Page (Example)" />
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-8 border-t pt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                How to Test
              </h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-600">
                <li>Enter the URL you want to test in the input field above</li>
                <li>Click on one of the test buttons (OpenGraph.xyz, Facebook, or Twitter)</li>
                <li>The tool will show you how your link will appear when shared</li>
                <li>Check if the image, title, and description are correct</li>
                <li>If using Facebook Debugger, you can click &quot;Scrape Again&quot; to refresh the cache</li>
              </ol>
            </div>

            {/* Current OG Image */}
            <div className="mt-8 border-t pt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Current OG Image
              </h2>
              <div className="bg-gray-100 rounded-lg p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src="/og-image.png" 
                  alt="Open Graph Preview" 
                  className="w-full max-w-2xl mx-auto rounded-lg shadow-lg"
                />
                <p className="text-sm text-gray-600 mt-4 text-center">
                  This is the default OG image for your site (1200x630px)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaTag({ name }: { name: string }) {
  const [content, setContent] = useState<string>("");

  useState(() => {
    if (typeof document !== "undefined") {
      const meta = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
      setContent(meta?.getAttribute("content") || "Not found");
    }
  });

  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-2 text-sm">
      <span className="font-mono font-semibold text-gray-700 min-w-[200px]">
        {name}:
      </span>
      <span className="text-gray-600 break-all">{content || "Loading..."}</span>
    </div>
  );
}

function TestUrlButton({ url, label }: { url: string; label: string }) {
  return (
    <button
      onClick={() => {
        window.open(`https://www.opengraph.xyz/url/${encodeURIComponent(url)}`, "_blank");
      }}
      className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition flex items-center justify-between group"
    >
      <span className="font-medium text-gray-700">{label}</span>
      <span className="text-sm text-gray-500 group-hover:text-gray-700 transition">
        {url} →
      </span>
    </button>
  );
}
