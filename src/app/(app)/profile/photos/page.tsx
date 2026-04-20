"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronLeft } from "lucide-react";
import { PhotoUpload } from "@/components/PhotoUpload";

export default function PhotoGalleryPage() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();

  // Ordered list for display: primary first, then everything else in the
  // existing `user.photos` order. This keeps the grid's visual order
  // stable as the user adds/removes photos.
  const currentPhotos = [
    ...(user?.profilePhoto ? [user.profilePhoto] : []),
    ...(user?.photos || []).filter((p) => p !== user?.profilePhoto),
  ];

  const handleAdd = (url: string) => {
    if (!user) return;
    const isFirst = currentPhotos.length === 0;
    // First photo becomes primary automatically. Additional uploads just
    // append to the non-primary list.
    updateProfile({
      profilePhoto: isFirst ? url : user.profilePhoto,
      photos: isFirst
        ? []
        : [...(user.photos || []).filter((p) => p !== user.profilePhoto), url],
    });
  };

  const handleRemove = (url: string) => {
    if (!user) return;
    const wasProfilePhoto = url === user.profilePhoto;
    const newPhotos = (user.photos || []).filter((p) => p !== url);
    updateProfile({
      // When the primary is removed, auto-promote the next photo so the
      // profile is never left without a primary.
      profilePhoto: wasProfilePhoto ? newPhotos[0] : user.profilePhoto,
      photos: wasProfilePhoto ? newPhotos.slice(1) : newPhotos,
    });
  };

  /**
   * Explicitly change which uploaded photo is the profile's primary. This
   * keeps `profilePhoto` + the remaining `photos` list in sync so the
   * ordered display contract above keeps holding.
   */
  const handleSetPrimary = (url: string) => {
    if (!user) return;
    if (url === user.profilePhoto) return;
    const remaining = [
      ...(user.profilePhoto ? [user.profilePhoto] : []),
      ...(user.photos || []).filter((p) => p !== url && p !== user.profilePhoto),
    ];
    updateProfile({
      profilePhoto: url,
      photos: remaining,
    });
  };

  const userId = user?.id || user?.memberId || "current";

  return (
    <div className="max-w-2xl mx-auto">
      <header className="bg-white border-b border-[var(--border)] px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-lg hover:bg-gray-100"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-semibold">Photo Gallery</h1>
      </header>
      <div className="p-4 space-y-3">
        <p className="text-sm text-gray-600">
          Your primary photo is shown on search results and in suggestions.
          Tap &ldquo;Set as primary&rdquo; on any other photo to promote it.
        </p>
        <PhotoUpload
          currentPhotos={currentPhotos}
          onAdd={handleAdd}
          onRemove={handleRemove}
          primaryUrl={user?.profilePhoto}
          onSetPrimary={handleSetPrimary}
          minCount={1}
          userId={userId}
          profileId={user?.id}
        />
      </div>
    </div>
  );
}
