import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";

const BUCKET = "profile-kyc-documents";
const MAX_FILE_SIZE = 8 * 1024 * 1024;

export const runtime = "nodejs";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const userId = (formData.get("userId") as string | null) || "unknown";
    if (!file) return errorResponse("Missing file", 400);

    const allowed = [
      "image/webp",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/pdf",
    ];
    if (!allowed.includes(file.type)) {
      return errorResponse(`Unsupported file type: ${file.type}`, 400);
    }
    if (file.size > MAX_FILE_SIZE) {
      return errorResponse("File too large. Max 8MB.", 413);
    }

    const supabase = createSupabaseAdmin();
    const ext = file.type === "application/pdf" ? "pdf" : "webp";
    const safeUser = userId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const path = `${safeUser}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) return errorResponse(error.message || "Upload failed", 500);
    return NextResponse.json({ storagePath: data.path, fileType: file.type });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Upload failed", 500);
  }
}
