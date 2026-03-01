import imageCompression from "browser-image-compression";

/**
 * Compresses an image and converts it to WebP format before upload.
 * Runs in a web worker to avoid blocking the main thread.
 */
export async function compressAndConvertToWebP(file: File): Promise<File> {
  const options = {
    fileType: "image/webp" as const,
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  };

  const compressed = await imageCompression(file, options);
  return new File([compressed], compressed.name.replace(/\.[^.]+$/, ".webp"), {
    type: "image/webp",
    lastModified: Date.now(),
  });
}
