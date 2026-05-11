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

/**
 * Returns the ISO Monday-anchored week containing `d`. Used so that
 * "this week" / "last week" always start on Monday in the UK locale,
 * regardless of system locale.
 */
function startOfWeek(d: Date) {
  const out = startOfDay(d);
  const day = out.getDay(); // 0 = Sun … 6 = Sat
  const offsetToMonday = day === 0 ? -6 : 1 - day;
  out.setDate(out.getDate() + offsetToMonday);
  return out;
}

export type DashboardRange = "today" | "yesterday" | "this-week" | "last-week";

const VALID_RANGES: DashboardRange[] = ["today", "yesterday", "this-week", "last-week"];

interface RangeWindow {
  from: Date;
  to: Date;
  /** Short label shown in the section heading, e.g. "Today's lessons". */
  label: string;
}

function computeRange(range: DashboardRange, now: Date): RangeWindow {
  if (range === "yesterday") {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return { from: startOfDay(d), to: endOfDay(d), label: "Yesterday" };
  }
  if (range === "this-week") {
    const start = startOfWeek(now);
    const end = endOfDay(new Date(start.getTime() + 6 * 86_400_000));
    return { from: start, to: end, label: "This week" };
  }
  if (range === "last-week") {
    const thisStart = startOfWeek(now);
    const start = new Date(thisStart.getTime() - 7 * 86_400_000);
    const end = endOfDay(new Date(thisStart.getTime() - 1));
    return { from: start, to: end, label: "Last week" };
  }
  // today (default)
  return { from: startOfDay(now), to: endOfDay(now), label: "Today" };
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

  const rangeParam = searchParams.get("range") as DashboardRange | null;
  const range: DashboardRange = rangeParam && VALID_RANGES.includes(rangeParam) ? rangeParam : "today";

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

  const window = computeRange(range, new Date());

  const [rangeLessons, totalLessons, completedLessons, nextReward] =
    await Promise.all([
      db.lesson.findMany({
        where: {
          childId,
          dayDate: { gte: window.from, lte: window.to },
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

  // Subject progress for lessons in the selected window
  const subjects = Array.from(new Set(rangeLessons.map((l) => l.subject)));
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

  const doneInRange = rangeLessons.filter((l) => l.status === "COMPLETED").length;
  const curriculumPercent =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return NextResponse.json({
    child,
    familyProfile,
    range,
    rangeLabel: window.label,
    rangeFrom: window.from.toISOString(),
    rangeTo: window.to.toISOString(),
    // Kept under the original key name so existing callers don't break;
    // semantically these are now "lessons in the selected window".
    todaysLessons: rangeLessons.map((l) => ({
      ...l,
      parsedContent: safeParseJson(l.generatedContent),
    })),
    stats: {
      // "Today" semantics widened to "in the selected range" — both fields
      // are renamed in spirit but kept under their original keys so the
      // existing UI code keeps compiling.
      lessonsDoneToday: doneInRange,
      totalLessonsToday: rangeLessons.length,
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
