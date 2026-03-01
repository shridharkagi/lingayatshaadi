import { useEffect, useRef } from "react";

/**
 * Hook to protect images from being downloaded
 * Adds right-click prevention and drag protection
 */
export function useImageProtection(enabled: boolean = true) {
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!enabled || !ref.current) return;

    const element = ref.current;

    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    const preventDrag = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    element.addEventListener("contextmenu", preventContextMenu);
    element.addEventListener("dragstart", preventDrag);

    // Add CSS to prevent selection
    element.style.userSelect = "none";
    element.style.webkitUserSelect = "none";
    element.style.pointerEvents = "auto";

    return () => {
      element.removeEventListener("contextmenu", preventContextMenu);
      element.removeEventListener("dragstart", preventDrag);
    };
  }, [enabled]);

  return ref;
}

/**
 * Hook for adding watermark to images (for non-premium users)
 */
export function useImageWatermark(
  imageUrl: string,
  watermarkText: string,
  enabled: boolean = true
): string | null {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [watermarkedUrl, setWatermarkedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !imageUrl) {
      setWatermarkedUrl(null);
      return;
    }

    const canvas = document.createElement("canvas");
    canvasRef.current = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Add watermark
      const fontSize = Math.max(20, img.width / 20);
      ctx.font = `${fontSize}px Arial`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Draw watermark in center
      ctx.fillText(watermarkText, canvas.width / 2, canvas.height / 2);

      // Optionally add watermark in corners
      ctx.font = `${fontSize * 0.6}px Arial`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      
      // Top-left
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(watermarkText, 10, 10);
      
      // Bottom-right
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillText(watermarkText, canvas.width - 10, canvas.height - 10);

      // Convert to data URL
      const watermarked = canvas.toDataURL("image/jpeg", 0.9);
      setWatermarkedUrl(watermarked);
    };

    img.onerror = () => {
      console.error("Failed to load image for watermarking");
      setWatermarkedUrl(null);
    };

    img.src = imageUrl;

    return () => {
      if (canvasRef.current) {
        canvasRef.current.remove();
      }
    };
  }, [imageUrl, watermarkText, enabled]);

  return watermarkedUrl;
}

// Import useState
import { useState } from "react";
