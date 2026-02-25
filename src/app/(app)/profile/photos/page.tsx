"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";
import { ChevronLeft, Plus } from "lucide-react";

export default function PhotoGalleryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const photos = user?.profilePhoto ? [user.profilePhoto] : [];

  return (
    <div className="max-w-2xl mx-auto">
      <header className="bg-white border-b border-[var(--border)] px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-lg hover:bg-gray-100">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-semibold">Photo Gallery</h1>
      </header>
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {photos.map((url, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-200">
              <Image src={url} alt="" fill className="object-cover" unoptimized />
            </div>
          ))}
          <button className="aspect-square rounded-xl border-2 border-dashed border-[var(--border)] flex items-center justify-center hover:bg-gray-50 transition">
            <Plus size={32} className="text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
