"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Plus, X, Loader2, Check, Star } from "lucide-react";
import { compressAndConvertToWebP } from "@/lib/imageCompression";
import { MAX_PROFILE_IMAGES } from "@/data/constants";
import { createPhotoRecord, deletePhotoByUrl } from "@/lib/api/photos";

interface PhotoUploadProps {
  /** Ordered list of photo URLs currently saved on the profile. */
  currentPhotos: string[];
  /** Called with the new public URL after a successful upload. */
  onAdd: (url: string) => void;
  /** Called when the user removes a photo. */
  onRemove: (url: string) => void;
  /** Optional: max number of photos the user can have (defaults to constant). */
  maxCount?: number;
  /**
   * Minimum photos the user must keep. When attempting to remove a photo
   * that would drop the count below this, we show a blocking hint instead
   * of calling `onRemove`. Defaults to 0 so legacy usages are unaffected.
   */
  minCount?: number;
  /** The current user (or profile) id — used to namespace storage uploads. */
  userId: string;
  /**
   * URL of the current primary photo. When provided, it's visually chipped
   * with a "Primary" badge and non-primary photos show a "Set as primary"
   * action on hover/tap. When omitted, primary UI is hidden entirely.
   */
  primaryUrl?: string;
  /** Called when the user taps "Set as primary" on a non-primary photo. */
  onSetPrimary?: (url: string) => void;
  /**
   * Optional: the `profiles.id` the photo belongs to. When provided, every
   * successful upload ALSO inserts a row into `profile_photos` with
   * `status = 'pending'` so the admin photo-moderation queue can surface
   * it. When omitted (e.g. very first step of a brand-new profile creation
   * before the draft row exists), the photo still uploads but isn't
   * tracked per-photo — the profile-level moderation still gates it.
   * Failures in this bookkeeping write are logged but never block the
   * user's upload.
   */
  profileId?: string;
}

/**
 * Map low-level fetch / network errors into something a user can actually
 * act on. The bare "Load failed" / "Failed to fetch" strings come from the
 * browser when a network request dies before a response is received
 * (flaky wifi, CORS, blocked by extension, body too large for platform).
 */
function humanizeUploadError(err: unknown): string {
  if (err instanceof TypeError) {
    return "Network error during upload. Check your internet connection and try again — if this keeps happening the photo might be too large.";
  }
  if (err instanceof Error) {
    const msg = err.message || "Upload failed";
    // Common browser strings we want to explain better.
    if (/load failed|failed to fetch/i.test(msg)) {
      return "Couldn't reach the server. Check your connection, then retry. Large photos sometimes time out — a smaller image usually works.";
    }
    if (/413|too large|payload/i.test(msg)) {
      return "That photo is too large to upload. Please pick a smaller one or crop it before trying again.";
    }
    return msg;
  }
  return "Upload failed. Please try again.";
}

export function PhotoUpload({
  currentPhotos,
  onAdd,
  onRemove,
  maxCount = MAX_PROFILE_IMAGES,
  minCount = 0,
  userId,
  primaryUrl,
  onSetPrimary,
  profileId,
}: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const canAdd = currentPhotos.length < maxCount;
  const showPrimaryUI = typeof primaryUrl === "string" && !!onSetPrimary;

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    // Reset the input so picking the same file again still fires onChange.
    e.target.value = "";
    if (files.length === 0 || !canAdd) return;

    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      const SOURCE_LIMIT_MB = 10;
      const availableSlots = Math.max(0, maxCount - currentPhotos.length);
      const selected = files.slice(0, availableSlots);
      if (selected.length < files.length) {
        setInfo(`Only ${availableSlots} more photo${availableSlots === 1 ? "" : "s"} can be uploaded.`);
      }

      for (let idx = 0; idx < selected.length; idx += 1) {
        const file = selected[idx];
        if (file.size > SOURCE_LIMIT_MB * 1024 * 1024) {
          throw new Error(
            `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)}MB — choose files under ${SOURCE_LIMIT_MB}MB.`
          );
        }
        const compressed = await compressAndConvertToWebP(file);
        const formData = new FormData();
        formData.append("file", compressed);
        formData.append("userId", userId);
        const res = await fetch("/api/upload-photo", { method: "POST", body: formData });
        let data: { url?: string; storagePath?: string; error?: string } = {};
        try {
          data = await res.json();
        } catch {
          // no-op
        }
        if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
        if (!data.url) throw new Error("Upload succeeded but no URL was returned. Please retry.");

        if (profileId) {
          const isFirstPhoto = currentPhotos.length === 0 && idx === 0;
          const { error: recordErr } = await createPhotoRecord({
            profileId,
            url: data.url,
            storagePath: data.storagePath,
            isPrimary: isFirstPhoto,
            sortOrder: currentPhotos.length + idx,
          });
          if (recordErr) {
            console.warn("[PhotoUpload] photo uploaded but profile_photos insert failed:", recordErr);
          }
        }
        onAdd(data.url);
      }
    } catch (err) {
      setError(humanizeUploadError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = (url: string) => {
    // Respect minCount: photos page passes 1 so we never end up with a
    // photoless profile. Owner still sees the Delete affordance but tapping
    // it warns instead of silently doing nothing.
    if (minCount > 0 && currentPhotos.length <= minCount) {
      setError(null);
      setInfo(
        `You need to keep at least ${minCount} photo${minCount === 1 ? "" : "s"}. Upload a replacement first, then remove this one.`
      );
      return;
    }
    setInfo(null);
    // Fire-and-forget cleanup of the mirror row in `profile_photos` plus
    // its Storage object. We intentionally don't await this — the UI
    // should update instantly, and if the bookkeeping delete fails it's
    // an orphan row, not a user-visible bug. See `deletePhotoByUrl`.
    if (profileId) {
      deletePhotoByUrl(profileId, url).then(({ error: delErr }) => {
        if (delErr) {
          console.warn("[PhotoUpload] profile_photos cleanup failed:", delErr);
        }
      });
    }
    onRemove(url);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {currentPhotos.map((url, i) => {
          const isPrimary = showPrimaryUI && url === primaryUrl;
          return (
            <div
              key={url}
              className={`relative aspect-square rounded-xl overflow-hidden bg-gray-200 group ${
                isPrimary ? "ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-white" : ""
              }`}
            >
              <Image
                src={url}
                alt={`Profile photo ${i + 1}`}
                fill
                className="object-cover"
                unoptimized
                sizes="(max-width: 768px) 50vw, 33vw"
              />

              {/* Primary chip — shown in the top-left when this photo is the
                  profile's primary. Acts as a purely visual indicator. */}
              {isPrimary && (
                <span className="absolute top-2 left-2 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-[var(--primary)] text-white shadow">
                  <Check size={12} />
                  Primary
                </span>
              )}

              {/* "Set as primary" action — shown only on non-primary photos
                  when `onSetPrimary` is wired up. */}
              {showPrimaryUI && !isPrimary && (
                <button
                  type="button"
                  onClick={() => onSetPrimary?.(url)}
                  className="absolute bottom-2 left-2 inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full bg-white/90 text-gray-800 shadow hover:bg-white transition"
                  title="Make this the primary photo"
                >
                  <Star size={12} />
                  Set as primary
                </button>
              )}

              <button
                type="button"
                onClick={() => handleRemove(url)}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                aria-label="Remove photo"
              >
                <X size={18} />
              </button>
            </div>
          );
        })}
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
        multiple
        onChange={handleSelect}
        className="hidden"
      />
      {!canAdd && (
        <p className="text-sm text-amber-600">
          Maximum {maxCount} photos allowed. Remove one to add more.
        </p>
      )}
      <p className="text-xs text-gray-500">
        Photos up to 10 MB are supported. They&apos;re automatically
        compressed and converted to WebP before upload.
      </p>
      {info && <p className="text-sm text-amber-700">{info}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
