import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { put } from "@vercel/blob";

/**
 * Uploads a journal entry image to Vercel Blob and returns the public URL.
 *
 * The previous implementation wrote to `public/uploads/journal/` on disk,
 * which fails on Vercel — serverless functions can't write to the local
 * filesystem. Vercel Blob is the lowest-friction storage for this stack:
 * provision a Blob store from the Vercel dashboard (Storage → Create →
 * Blob) and the BLOB_READ_WRITE_TOKEN env var is auto-injected.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          "Image storage isn't configured. Provision a Vercel Blob store (Storage → Create → Blob) and redeploy.",
      },
      { status: 500 },
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only images are allowed" }, { status: 400 });
    }

    // Max 5 MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    // Namespace by user so blobs are easy to audit/clean up later.
    const filename = `journal/${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const blob = await put(filename, file, {
      access: "public",
      contentType: file.type,
    });

    return NextResponse.json({ url: blob.url }, { status: 201 });
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : "Upload failed";
    console.error("[journal/upload] error:", detail);
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
