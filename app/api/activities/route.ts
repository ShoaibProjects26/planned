import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkAndAwardBadges } from "@/lib/bloom";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    childId,
    description,
    subject,
    durationMins,
    notes,
    activityDate,
    objectivesLinked = [],
  } = body;

  if (!childId || !description || !subject) {
    return NextResponse.json(
      { error: "childId, description, and subject are required" },
      { status: 400 }
    );
  }

  const child = await db.child.findFirst({
    where: { id: childId, userId: session.user.id },
  });
  if (!child) return NextResponse.json({ error: "Child not found" }, { status: 404 });

  const parsedDuration = durationMins ? Math.max(parseInt(durationMins, 10) || 0, 0) : 0;
  const parsedDate = activityDate ? new Date(activityDate) : new Date();

  const activity = await db.externalActivity.create({
    data: {
      childId,
      description,
      subject,
      durationMins: parsedDuration,
      notes: notes ?? null,
      activityDate: parsedDate,
      objectivesLinked: JSON.stringify(objectivesLinked),
    },
  });

  // Update Progress table
  await db.progress.upsert({
    where: { childId_subject: { childId, subject } },
    update: {
      topicsTotal: { increment: 1 },
      totalMinutes: { increment: parsedDuration },
    },
    create: {
      childId,
      subject,
      topicsCompleted: 0,
      topicsTotal: 1,
      objectivesMet: 0,
      totalMinutes: parsedDuration,
    },
  });

  // Award 1 bloom star per external activity
  await db.child.update({
    where: { id: childId },
    data: { bloomStars: { increment: 1 } },
  });

  // Check for newly unlocked badges
  const newBadges = await checkAndAwardBadges(childId);

  return NextResponse.json({ activity, newBadges }, { status: 201 });
}
