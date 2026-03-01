"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Plus, X, Loader2 } from "lucide-react";
import { compressAndConvertToWebP } from "@/lib/imageCompression";
import { MAX_PROFILE_IMAGES } from "@/data/constants";

interface PhotoUploadProps {
  currentPhotos: string[];
  onAdd: (url: string) => void;
  onRemove: (url: string) => void;
  maxCount?: number;
  userId: string;
  profilePhotoIndex?: number;
}

export function PhotoUpload({
  currentPhotos,
  onAdd,
  onRemove,
  maxCount = MAX_PROFILE_IMAGES,
  userId,
}: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAdd = currentPhotos.length < maxCount;

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !canAdd) return;

    setError(null);
    setLoading(true);

    try {
      const compressed = await compressAndConvertToWebP(file);

      const formData = new FormData();
      formData.append("file", compressed);
      formData.append("userId", userId);

      const res = await fetch("/api/upload-photo", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      onAdd(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {currentPhotos.map((url, i) => (
          <div
            key={url}
            className="relative aspect-square rounded-xl overflow-hidden bg-gray-200 group"
          >
            <Image
              src={url}
              alt={`Profile photo ${i + 1}`}
              fill
              className="object-cover"
              unoptimized
              sizes="(max-width: 768px) 50vw, 33vw"
            />
            <button
              type="button"
              onClick={() => onRemove(url)}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Remove photo"
            >
              <X size={18} />
            </button>
          </div>
        ))}
        {canAdd && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className="aspect-square rounded-xl border-2 border-dashed border-[var(--border)] flex flex-col items-center justify-center gap-2 hover:bg-gray-50 hover:border-[var(--primary)]/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 size={32} className="text-gray-400 animate-spin" />
            ) : (
              <Plus size={32} className="text-gray-400" />
            )}
            <span className="text-sm text-gray-500">
              {loading ? "Uploading..." : "Add photo"}
            </span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleSelect}
        className="hidden"
      />
      {!canAdd && (
        <p className="text-sm text-amber-600">
          Maximum {maxCount} photos allowed. Remove one to add more.
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
