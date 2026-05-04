import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { anthropic, MODEL } from "@/lib/anthropic";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { subject: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { childId } = await req.json();
  if (!childId) return NextResponse.json({ error: "childId required" }, { status: 400 });

  const subject = decodeURIComponent(params.subject);

  const child = await db.child.findFirst({
    where: { id: childId, userId: session.user.id },
  });
  if (!child) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [progressRow, completedLessons, pendingLessons, metObjectives, totalObjectives] =
    await Promise.all([
      db.progress.findUnique({
        where: { childId_subject: { childId, subject } },
      }),
      db.lesson.count({ where: { childId, subject, status: "COMPLETED" } }),
      db.lesson.count({ where: { childId, subject, status: "PENDING" } }),
      db.lessonObjective.count({ where: { lesson: { childId, subject }, completed: true } }),
      db.lessonObjective.count({ where: { lesson: { childId, subject } } }),
    ]);

  const abilityLevel =
    subject === "Mathematics" || subject === "Maths"
      ? child.numeracyLevel
      : subject === "English" || subject === "Literacy"
      ? child.literacyLevel
      : child.reasoningLevel;

  const totalMinutes = progressRow?.totalMinutes ?? 0;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins} minutes`;

  const prompt = `You are a warm, experienced UK homeschool advisor. Give a parent brief, actionable guidance on what to focus on next for their child in this subject.

Child: ${child.name}, ${child.yearGroup ?? "primary age"}
Subject: ${subject}
Ability level: ${abilityLevel} (EMERGING / DEVELOPING / SECURE / EXCEEDING scale)
Topics completed: ${completedLessons}
Topics remaining: ${pendingLessons}
Learning objectives met: ${metObjectives} of ${totalObjectives}
Total time spent: ${timeStr}

Write 2-3 sentences of warm, specific, practical guidance for the parent. Focus on what to prioritise next, how to build on what ${child.name} has already done, and one concrete suggestion. Be encouraging.`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 256,
    messages: [{ role: "user", content: prompt }],
  });

  const note =
    message.content[0].type === "text" ? message.content[0].text.trim() : "";

  return NextResponse.json({ note });
}
