"use client";

import { useState } from "react";

export default function TestLoginPage() {
  const [mode, setMode] = useState<"email" | "otp">("email");

  return (
    <div className="min-h-screen bg-white p-8">
      <h1 className="text-2xl font-bold mb-8">Simple Test Page - No Complex Dependencies</h1>
      
      <div className="flex gap-4 mb-8">
        <button
          type="button"
          onClick={() => {
            console.log("Email clicked!");
            setMode("email");
          }}
          className={`px-6 py-3 rounded-lg font-medium ${
            mode === "email"
              ? "bg-orange-500 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          Email (mode: {mode === "email" ? "ACTIVE" : "inactive"})
        </button>
        
        <button
          type="button"
          id="test-otp-tab"
          onClick={() => {
            console.log("Mobile OTP clicked!");
            setMode("otp");
          }}
          className={`px-6 py-3 rounded-lg font-medium ${
            mode === "otp"
              ? "bg-orange-500 text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          Mobile OTP (mode: {mode === "otp" ? "ACTIVE" : "inactive"})
        </button>
      </div>

      <div className="p-4 bg-gray-100 rounded">
        <h2 className="font-bold mb-2">Current Mode: {mode}</h2>
        <p>If you can't click these buttons, there's a fundamental issue with React 19 event handling.</p>
        <p className="mt-2 text-sm text-gray-600">
          Try running in console: document.getElementById('test-otp-tab').click()
        </p>
      </div>

      <div className="mt-8">
        {mode === "email" ? (
          <div className="p-4 bg-blue-50 rounded">
            <h3 className="font-bold">Email Form</h3>
            <input
              type="email"
              placeholder="Enter email"
              className="mt-2 px-4 py-2 border rounded w-full"
            />
          </div>
        ) : (
          <div className="p-4 bg-green-50 rounded">
            <h3 className="font-bold">Mobile OTP Form</h3>
            <input
              type="tel"
              placeholder="Enter mobile number"
              className="mt-2 px-4 py-2 border rounded w-full"
            />
          </div>
        )}
      </div>
    </div>
  );
}
