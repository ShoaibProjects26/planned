import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateLesson } from "@/lib/lessonGenerator";
import { getUserTier } from "@/lib/subscription";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lesson = await db.lesson.findFirst({
    where: { id: params.id, child: { userId: session.user.id } },
    include: { objectives: true },
  });

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  // Pass the user's tier so generateLesson can omit Premium-only sections
  // (e.g. the "day out" venue suggestion) for non-Premium users.
  const tier = await getUserTier(session.user.id);

  // Check if we already have a full lesson (avoid duplicate API calls)
  try {
    const existing = JSON.parse(lesson.generatedContent);
    if (existing?.teachingGuide?.length) {
      // Strip Premium-only sections from cached content for non-Premium users
      // (the lesson may have been generated while the user was on Premium, or
      // before we started gating this content).
      if (tier !== "PREMIUM") {
        delete existing.dayOut;
      }
      const objectives = await ensureObjectives(lesson.id, existing.objectives ?? []);
      return NextResponse.json({ content: existing, objectives });
    }
  } catch {
    // continue to generate
  }

  let content;
  try {
    content = await generateLesson(lesson.childId, lesson.subject, lesson.topic, tier);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "AI generation failed";
    console.error("[generate-detail]", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  // Persist full content back to the lesson
  await db.lesson.update({
    where: { id: lesson.id },
    data: { generatedContent: JSON.stringify(content) },
  });

  // Create LessonObjective records
  const objectives = await ensureObjectives(lesson.id, content.objectives ?? []);

  return NextResponse.json({ content, objectives });
}

async function ensureObjectives(
  lessonId: string,
  texts: string[]
): Promise<{ id: string; text: string; completed: boolean; completedAt: string | null }[]> {
  // Delete stale objectives and recreate to keep in sync
  const existing = await db.lessonObjective.findMany({ where: { lessonId } });

  if (existing.length === texts.length) {
    // Already in sync
    return existing.map((o) => ({
      id: o.id,
      text: o.text,
      completed: o.completed,
      completedAt: o.completedAt?.toISOString() ?? null,
    }));
  }

  // Recreate
  await db.lessonObjective.deleteMany({ where: { lessonId } });
  const created = await db.$transaction(
    texts.map((text) =>
      db.lessonObjective.create({ data: { lessonId, text } })
    )
  );

  return created.map((o) => ({
    id: o.id,
    text: o.text,
    completed: o.completed,
    completedAt: o.completedAt?.toISOString() ?? null,
  }));
}
