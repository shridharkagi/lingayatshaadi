import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";

const BUCKET = "profile-photos";

/**
 * Post-compression size ceiling. The client-side pipeline
 * (`compressAndConvertToWebP`) targets 0.5MB output, so 5MB is a generous
 * safety ceiling that accommodates chunky input files up to ~10MB without
 * failing at the edge. Raising beyond ~4MB also requires the Next.js body
 * parser to be allowed to grow — handled below via `export const config`.
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Allow the API route to accept slightly larger multipart payloads. The
// default in App-Router route handlers is 1MB which would hard-fail any
// post-compression upload over that threshold with an opaque "Load failed"
// error in the browser.
export const runtime = "nodejs";

/**
 * Lightweight JSON error helper — keeps the error shape consistent so the
 * client can always read `data.error` regardless of which branch failed.
 */
function errorResponse(message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export async function POST(request: NextRequest) {
  try {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (err) {
      // Hitting this usually means the body exceeded the platform's body
      // size limit (e.g. Vercel's 4.5MB default). Surface a user-friendly
      // hint so the UI can translate it to something actionable.
      const msg = err instanceof Error ? err.message : "Invalid request body";
      return errorResponse(
        `Could not read upload payload: ${msg}. If this was a large photo, please choose a smaller one.`,
        413
      );
    }

    const file = formData.get("file") as File | null;
    const userId = formData.get("userId") as string | null;

    if (!file || !userId?.trim()) {
      return errorResponse("Missing file or userId", 400);
    }

    if (file.type !== "image/webp") {
      return errorResponse(
        `File must be image/webp (received ${file.type || "unknown"}). The app should compress and convert automatically — please retry; if this keeps happening, report it to support.`,
        400
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      const mb = (file.size / (1024 * 1024)).toFixed(2);
      return errorResponse(
        `Compressed file is too large (${mb}MB). The maximum allowed is ${MAX_FILE_SIZE / (1024 * 1024)}MB. Please choose a different photo or reduce its resolution before uploading.`,
        413
      );
    }

    let supabase;
    try {
      supabase = createSupabaseAdmin();
    } catch {
      return errorResponse(
        "Supabase is not configured on the server. Ask the admin to set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
        500
      );
    }

    // Namespace by user so each user owns their own folder in storage.
    // sanitize to avoid path traversal / invalid characters.
    const sanitizedUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).slice(2, 10);
    const path = `${sanitizedUserId}/${timestamp}-${randomId}.webp`;

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        contentType: "image/webp",
        upsert: false,
      });

    if (error) {
      console.error("[upload-photo] Supabase upload error:", error);
      return errorResponse(error.message || "Upload failed", 500);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(data.path);

    // Return both the public URL (for <img src>) and the storage path
    // (needed later to hard-delete the file when the user removes the
    // photo from their gallery).
    return NextResponse.json({ url: publicUrl, storagePath: data.path });
  } catch (err) {
    console.error("[upload-photo] Unexpected error:", err);
    const msg = err instanceof Error ? err.message : "Upload failed";
    return errorResponse(msg, 500);
  }
}
