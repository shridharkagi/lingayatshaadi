import imageCompression from "browser-image-compression";

/**
 * Compresses an image and converts it to WebP format before upload.
 * Runs in a web worker to avoid blocking the main thread.
 */
export async function compressAndConvertToWebP(file: File): Promise<File> {
  // Quality first: matrimony photos are judged closely. A 0.5 MB cap forced the
  // library to drop quality (and even resolution) until it fit, which made
  // uploads visibly soft. Keep resolution, start near-lossless, allow up to 1.5 MB
  // (server accepts up to 5 MB).
  const options = {
    fileType: "image/webp" as const,
    maxSizeMB: 1.5,
    maxWidthOrHeight: 2048,
    initialQuality: 0.92,
    alwaysKeepResolution: true,
    useWebWorker: true,
  };

  const compressed = await imageCompression(file, options);
  return new File([compressed], compressed.name.replace(/\.[^.]+$/, ".webp"), {
    type: "image/webp",
    lastModified: Date.now(),
  });
}
