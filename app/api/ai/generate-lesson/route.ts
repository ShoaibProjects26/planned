import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateLesson, LessonGenerationParams } from "@/lib/anthropic";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { subscriptionTier: true, subscriptionStatus: true },
  });

  if (!user || (user.subscriptionTier === "FREE" && user.subscriptionStatus === "INACTIVE")) {
    return NextResponse.json(
      { error: "Active subscription required for AI lesson generation" },
      { status: 403 }
    );
  }

  const body: LessonGenerationParams = await req.json();

  if (!body.subject || !body.topic || !body.yearGroup || !body.childName) {
    return NextResponse.json(
      { error: "Missing required fields: subject, topic, yearGroup, childName" },
      { status: 400 }
    );
  }

  const lesson = await generateLesson(body);
  return NextResponse.json({ lesson });
}
