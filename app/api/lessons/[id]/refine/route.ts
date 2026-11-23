import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateLesson, type RefineIntent } from "@/lib/lessonGenerator";
import { getUserTier } from "@/lib/subscription";
import { guardAiRequest } from "@/lib/aiGuard";

export const dynamic = "force-dynamic";

const VALID_INTENTS: RefineIntent[] = ["easier", "harder", "alternative"];

/**
 * POST /api/lessons/[id]/refine
 * Body: { intent: "easier" | "harder" | "alternative" }
 *
 * Re-generates the lesson detail with an adjusted prompt (easier wording,
 * harder stretch, or a different angle) and persists the new content,
 * replacing whatever was cached. Also resets the lesson's objectives.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let intent: RefineIntent;
  try {
    const body = await req.json();
    intent = body.intent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!VALID_INTENTS.includes(intent)) {
    return NextResponse.json(
      { error: `intent must be one of: ${VALID_INTENTS.join(", ")}` },
      { status: 400 },
    );
  }

  const lesson = await db.lesson.findFirst({
    where: { id: params.id, child: { userId: session.user.id } },
  });
  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  const tier = await getUserTier(session.user.id);

  const blocked = await guardAiRequest(session.user.id, tier, "refine");
  if (blocked) return blocked;

  let content;
  try {
    content = await generateLesson(lesson.childId, lesson.subject, lesson.topic, tier, intent);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "AI generation failed";
    console.error("[refine]", msg);
    return NextResponse.json(
      { error: "Couldn't refine the lesson. Please try again in a moment." },
      { status: 502 },
    );
  }

  // Persist the new content and reset objectives — old objectives no longer
  // match the new teachingGuide, and keeping their completed state would be
  // misleading.
  await db.$transaction([
    db.lesson.update({
      where: { id: lesson.id },
      data: { generatedContent: JSON.stringify(content) },
    }),
    db.lessonObjective.deleteMany({ where: { lessonId: lesson.id } }),
  ]);

  const objectives = await db.$transaction(
    (content.objectives ?? []).map((text) =>
      db.lessonObjective.create({ data: { lessonId: lesson.id, text } }),
    ),
  );

  return NextResponse.json({
    content,
    objectives: objectives.map((o) => ({
      id: o.id,
      text: o.text,
      completed: o.completed,
      completedAt: o.completedAt?.toISOString() ?? null,
    })),
  });
}
