import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserTier, tierAtLeast } from "@/lib/subscription";

export const dynamic = "force-dynamic";

const JOURNAL_PAYWALL = {
  error: "Journal is a Basic feature. Upgrade to Basic to record entries.",
  paywall: true,
  requiredTier: "BASIC" as const,
};

// ── GET /api/journal?childId= ──────────────────────────────────────────────────

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tier = await getUserTier(session.user.id);
  if (!tierAtLeast(tier, "BASIC")) {
    return NextResponse.json(JOURNAL_PAYWALL, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const childId = searchParams.get("childId");
  if (!childId) return NextResponse.json({ error: "childId required" }, { status: 400 });

  const child = await db.child.findFirst({
    where: { id: childId, userId: session.user.id },
  });
  if (!child) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const entries = await db.journalEntry.findMany({
    where: { childId },
    orderBy: { entryDate: "desc" },
  });

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalEntries = entries.length;
  const withPhotos   = entries.filter((e) => e.hasPhoto).length;
  const dayTrips     = entries.filter((e) => e.moment === "DAY_OUT").length;

  const weekSet = new Set(
    entries.map((e) => {
      const d = new Date(e.entryDate);
      // ISO week key: YYYY-WW
      const jan4 = new Date(d.getFullYear(), 0, 4);
      const week = Math.ceil(
        ((d.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7
      );
      return `${d.getFullYear()}-${week}`;
    })
  );
  const weeksCovered = weekSet.size;

  return NextResponse.json({
    child: { id: child.id, name: child.name, yearGroup: child.yearGroup },
    stats: { totalEntries, withPhotos, dayTrips, weeksCovered },
    entries: entries.map((e) => ({
      id: e.id,
      lessonId: e.lessonId,
      title: e.title,
      notes: e.notes,
      subject: e.subject,
      moment: e.moment,
      hasPhoto: e.hasPhoto,
      photoUrl: e.photoUrl,
      tags: JSON.parse(e.tags || "[]") as string[],
      entryDate: e.entryDate.toISOString(),
      createdAt: e.createdAt.toISOString(),
    })),
  });
}

// ── POST /api/journal ──────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tier = await getUserTier(session.user.id);
  if (!tierAtLeast(tier, "BASIC")) {
    return NextResponse.json(JOURNAL_PAYWALL, { status: 403 });
  }

  const body = await req.json();
  const {
    childId,
    notes,
    subject,
    title,
    moment = "REGULAR",
    lessonId,
    photoUrl,
    tags = [],
    entryDate,
  } = body;

  if (!childId || !notes?.trim()) {
    return NextResponse.json(
      { error: "childId and notes are required" },
      { status: 400 }
    );
  }

  const child = await db.child.findFirst({
    where: { id: childId, userId: session.user.id },
  });
  if (!child) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Auto-generate title if not provided
  const resolvedTitle =
    title?.trim() ||
    (subject ? `${subject} — ${new Date(entryDate || Date.now()).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : `Journal entry — ${new Date(entryDate || Date.now()).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`);

  const entry = await db.journalEntry.create({
    data: {
      childId,
      lessonId: lessonId ?? null,
      title: resolvedTitle,
      notes: notes.trim(),
      subject: subject ?? null,
      moment,
      hasPhoto: !!photoUrl,
      photoUrl: photoUrl ?? null,
      tags: JSON.stringify(tags),
      entryDate: entryDate ? new Date(entryDate) : new Date(),
    },
  });

  return NextResponse.json({ entry }, { status: 201 });
}
