import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function startOfDay(d: Date) {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function endOfDay(d: Date) {
  const out = new Date(d);
  out.setHours(23, 59, 59, 999);
  return out;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const childId = searchParams.get("childId");
  if (!childId) {
    return NextResponse.json({ error: "childId required" }, { status: 400 });
  }

  // Verify the child belongs to this user
  const child = await db.child.findFirst({
    where: { id: childId, userId: session.user.id },
  });
  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  const familyProfile = await db.familyProfile.findUnique({
    where: { userId: session.user.id },
  });

  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);

  const [todaysLessons, totalLessons, completedLessons, nextReward] =
    await Promise.all([
      db.lesson.findMany({
        where: {
          childId,
          dayDate: { gte: todayStart, lte: todayEnd },
        },
        orderBy: { dayDate: "asc" },
      }),
      db.lesson.count({ where: { childId } }),
      db.lesson.count({ where: { childId, status: "COMPLETED" } }),
      db.reward.findFirst({
        where: { childId, redeemed: false },
        orderBy: { starsRequired: "asc" },
      }),
    ]);

  // Subject progress for lessons in today's set
  const subjects = Array.from(new Set(todaysLessons.map((l) => l.subject)));
  const subjectProgress =
    subjects.length > 0
      ? await db.progress.findMany({
          where: { childId, subject: { in: subjects } },
        })
      : [];

  const progressMap: Record<string, { done: number; total: number }> = {};
  for (const p of subjectProgress) {
    progressMap[p.subject] = {
      done: p.topicsCompleted,
      total: p.topicsTotal,
    };
  }

  const doneToday = todaysLessons.filter((l) => l.status === "COMPLETED").length;
  const curriculumPercent =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return NextResponse.json({
    child,
    familyProfile,
    todaysLessons: todaysLessons.map((l) => ({
      ...l,
      parsedContent: safeParseJson(l.generatedContent),
    })),
    stats: {
      lessonsDoneToday: doneToday,
      totalLessonsToday: todaysLessons.length,
      curriculumPercent,
      bloomStars: child.bloomStars,
    },
    nextReward,
    hasAnyLessons: totalLessons > 0,
    subjectProgress: progressMap,
  });
}

function safeParseJson(str: string) {
  try {
    return JSON.parse(str);
  } catch {
    return {};
  }
}
