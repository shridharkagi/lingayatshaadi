"use client";

import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { HobbyTag } from "./HobbyTag";
import { HOBBY_SUGGESTIONS } from "@/data/constants";

interface HobbiesSelectorProps {
  value: string[];
  onChange: (hobbies: string[]) => void;
  placeholder?: string;
}

export function HobbiesSelector({ value, onChange, placeholder = "Add hobbies..." }: HobbiesSelectorProps) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = HOBBY_SUGGESTIONS.filter(
    (h) =>
      h.label.toLowerCase().includes(input.toLowerCase()) &&
      !value.includes(h.label)
  );

  const addHobby = (label: string) => {
    if (label.trim() && !value.includes(label.trim())) {
      onChange([...value, label.trim()]);
    }
    setInput("");
    setShowSuggestions(false);
  };

  const removeHobby = (label: string) => {
    onChange(value.filter((h) => h !== label));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && input.trim()) {
      const match = HOBBY_SUGGESTIONS.find(
        (h) => h.label.toLowerCase() === input.trim().toLowerCase()
      );
      addHobby(match?.label ?? input.trim());
    }
  };

  return (
    <div ref={ref} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Hobbies and Interests
      </label>
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((hobby) => (
          <span
            key={hobby}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-gray-800 text-sm"
          >
            <HobbyTag label={hobby} />
            <button
              type="button"
              onClick={() => removeHobby(hobby)}
              className="p-0.5 rounded-full hover:bg-gray-200 transition-colors text-gray-500"
              aria-label={`Remove ${hobby}`}
            >
              <X size={14} />
            </button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          list="hobby-suggestions"
          className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
        />
        <datalist id="hobby-suggestions">
          {HOBBY_SUGGESTIONS.map((h) => (
            <option key={h.id} value={h.label} />
          ))}
        </datalist>
        {showSuggestions && (input.trim() || filtered.length > 0) && (
          <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-auto rounded-xl border border-[var(--border)] bg-white shadow-lg py-1">
            {filtered.length > 0 ? (
              filtered.slice(0, 8).map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => addHobby(h.label)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm flex items-center gap-2"
                  >
                    <HobbyTag label={h.label} />
                  </button>
                </li>
              ))
            ) : input.trim() ? (
              <li>
                <button
                  type="button"
                  onClick={() => addHobby(input.trim())}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm"
                >
                  Add &quot;{input.trim()}&quot;
                </button>
              </li>
            ) : null}
          </ul>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-1">
        Choose from suggestions or type your own and press Enter
      </p>
    </div>
  );
}
