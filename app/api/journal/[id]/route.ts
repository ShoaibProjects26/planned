import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entry = await db.journalEntry.findFirst({
    where: { id: params.id, child: { userId: session.user.id } },
  });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: entry.id,
    lessonId: entry.lessonId,
    title: entry.title,
    notes: entry.notes,
    subject: entry.subject,
    moment: entry.moment,
    hasPhoto: entry.hasPhoto,
    photoUrl: entry.photoUrl,
    tags: JSON.parse(entry.tags || "[]") as string[],
    entryDate: entry.entryDate.toISOString(),
    createdAt: entry.createdAt.toISOString(),
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entry = await db.journalEntry.findFirst({
    where: { id: params.id, child: { userId: session.user.id } },
  });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.journalEntry.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
