"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronLeft } from "lucide-react";
import { PhotoUpload } from "@/components/PhotoUpload";

export default function PhotoGalleryPage() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();

  const currentPhotos = [
    ...(user?.profilePhoto ? [user.profilePhoto] : []),
    ...(user?.photos || []).filter((p) => p !== user?.profilePhoto),
  ];

  const handleAdd = (url: string) => {
    if (!user) return;
    const isFirst = currentPhotos.length === 0;
    updateProfile({
      profilePhoto: isFirst ? url : user.profilePhoto,
      photos: isFirst ? [] : [...(user.photos || []).filter((p) => p !== user.profilePhoto), url],
    });
  };

  const handleRemove = (url: string) => {
    if (!user) return;
    const wasProfilePhoto = url === user.profilePhoto;
    const newPhotos = (user.photos || []).filter((p) => p !== url);
    updateProfile({
      profilePhoto: wasProfilePhoto ? newPhotos[0] : user.profilePhoto,
      photos: wasProfilePhoto ? newPhotos.slice(1) : newPhotos,
    });
  };

  const userId = user?.id || user?.memberId || "current";

  return (
    <div className="max-w-2xl mx-auto">
      <header className="bg-white border-b border-[var(--border)] px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-lg hover:bg-gray-100">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-semibold">Photo Gallery</h1>
      </header>
      <div className="p-4">
        <PhotoUpload
          currentPhotos={currentPhotos}
          onAdd={handleAdd}
          onRemove={handleRemove}
          userId={userId}
        />
      </div>
    </div>
  );
}
