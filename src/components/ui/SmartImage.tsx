"use client";

import Image, { type ImageProps } from "next/image";

/**
 * Hosts allowed by `images.remotePatterns` in next.config.ts. Only these can go
 * through the Next.js optimizer; anything else must stay `unoptimized` or
 * next/image throws at runtime.
 */
function canOptimizeImage(src: ImageProps["src"]): boolean {
  if (typeof src !== "string") return true; // static import
  if (!src || src.startsWith("blob:") || src.startsWith("data:")) return false;
  if (/\.svg(\?|$)/i.test(src)) return false; // SVG is not optimised (dangerouslyAllowSVG is off)
  if (src.startsWith("/")) return true; // local /public asset
  try {
    const u = new URL(src);
    if (u.protocol !== "https:") return false;
    if (u.hostname === "images.unsplash.com") return true;
    return u.hostname.endsWith(".supabase.co") && u.pathname.startsWith("/storage/v1/object/public/");
  } catch {
    return false;
  }
}

/**
 * Drop-in replacement for next/image that serves resized WebP/AVIF for member
 * photos (a 1–2 MB original becomes ~30–80 KB at card size). Pass `unoptimized`
 * explicitly to opt out.
 */
export default function SmartImage({ unoptimized, alt, ...props }: ImageProps) {
  return <Image {...props} alt={alt} unoptimized={unoptimized ?? !canOptimizeImage(props.src)} />;
}
