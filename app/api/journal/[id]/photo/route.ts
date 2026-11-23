import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { get } from "@vercel/blob";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { blobAccessFor } from "@/lib/blobCleanup";

export const dynamic = "force-dynamic";

/**
 * GET /api/journal/[id]/photo
 *
 * Streams a journal photo to the parent who owns it. Photos are stored in a
 * private Blob store, so this authenticated route is the only way to view
 * them. No tier check: a parent can always see their own child's photos
 * (right of access), even after downgrading.
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const entry = await db.journalEntry.findFirst({
    where: { id: params.id, child: { userId: session.user.id } },
    select: { photoUrl: true },
  });
  if (!entry?.photoUrl) return new NextResponse("Not found", { status: 404 });

  try {
    const result = await get(entry.photoUrl, { access: blobAccessFor(entry.photoUrl) });
    if (!result || result.statusCode !== 200) {
      return new NextResponse("Not found", { status: 404 });
    }
    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType || "application/octet-stream",
        // Private to this browser; never cached by shared proxies / CDNs.
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("[journal/photo]", err instanceof Error ? err.message : err);
    return new NextResponse("Unavailable", { status: 502 });
  }
}
