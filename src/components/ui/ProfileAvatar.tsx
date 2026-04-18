"use client";

import Image from "next/image";
import { useState } from "react";

interface ProfileAvatarProps {
  src?: string | null;
  alt: string;
  size?: number;
  className?: string;
  rounded?: "full" | "xl";
}

const FALLBACK = "/profile-placeholder.svg";

/** Image with built-in fallback when the URL is missing or fails to load. */
export function ProfileAvatar({
  src,
  alt,
  size = 64,
  className = "",
  rounded = "xl",
}: ProfileAvatarProps) {
  const [errored, setErrored] = useState(false);
  const url = !src || errored ? FALLBACK : src;
  const radius = rounded === "full" ? "rounded-full" : "rounded-xl";
  return (
    <div
      className={`${radius} overflow-hidden flex-shrink-0 bg-gray-100 ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={url}
        alt={alt}
        width={size}
        height={size}
        className="object-cover w-full h-full"
        unoptimized
        onError={() => setErrored(true)}
      />
    </div>
  );
}
