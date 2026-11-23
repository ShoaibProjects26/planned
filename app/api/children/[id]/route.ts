import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteJournalPhotos } from "@/lib/blobCleanup";

export const dynamic = "force-dynamic";

const updateSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(60),
    age: z.number().int().min(4).max(11),
    yearGroup: z.string().trim().max(30),
    learningStyle: z.string().trim().max(40).nullable(),
    interests: z.array(z.string().trim().min(1).max(40)).max(30),
  })
  .partial();

async function ownedChild(userId: string, childId: string) {
  return db.child.findFirst({ where: { id: childId, userId }, select: { id: true } });
}

/** PATCH /api/children/[id] — edit a child's profile (rectification). */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await ownedChild(session.user.id, params.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { interests, ...rest } = parsed.data;

  const child = await db.child.update({
    where: { id: params.id },
    data: {
      ...rest,
      ...(interests !== undefined && { interests: JSON.stringify(interests) }),
    },
  });

  return NextResponse.json({ child });
}

/**
 * DELETE /api/children/[id] — permanently delete a child and everything
 * linked to them (lessons, journal, progress, rewards, badges, activities)
 * plus their journal photos in Blob storage.
 */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await ownedChild(session.user.id, params.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const photos = await db.journalEntry.findMany({
    where: { childId: params.id, photoUrl: { not: null } },
    select: { photoUrl: true },
  });

  // DB relations cascade (see prisma/schema.prisma).
  await db.child.delete({ where: { id: params.id } });
  await deleteJournalPhotos(session.user.id, photos.map((p) => p.photoUrl));

  return NextResponse.json({ ok: true });
}
