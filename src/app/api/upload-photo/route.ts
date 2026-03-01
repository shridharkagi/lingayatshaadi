import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";

const BUCKET = "profile-photos";
const MAX_FILE_SIZE = 1024 * 1024; // 1MB

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Supabase is not configured" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("userId") as string | null;

    if (!file || !userId?.trim()) {
      return NextResponse.json(
        { error: "Missing file or userId" },
        { status: 400 }
      );
    }

    if (file.type !== "image/webp") {
      return NextResponse.json(
        { error: "File must be image/webp" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 1MB)" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();
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
      console.error("Supabase upload error:", error);
      return NextResponse.json(
        { error: error.message || "Upload failed" },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(data.path);

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
