import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateLesson, LessonGenerationParams } from "@/lib/anthropic";
import { getUserTier } from "@/lib/subscription";
import { rateLimit } from "@/lib/rateLimit";

// Free tier is allowed AI generation but at a much lower rate.
const RATE_LIMITS = {
  FREE:    { limit: 5,  windowMs: 60 * 60 * 1000 },  // 5/hour
  BASIC:   { limit: 30, windowMs: 60 * 60 * 1000 },  // 30/hour
  PREMIUM: { limit: 90, windowMs: 60 * 60 * 1000 },  // 90/hour
} as const;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tier = await getUserTier(session.user.id);
  const { limit, windowMs } = RATE_LIMITS[tier];
  const rl = rateLimit(`ai:${session.user.id}`, limit, windowMs);
  if (!rl.ok) {
    return NextResponse.json(
      {
        error: `You've hit the AI generation limit for your plan. Try again in ${rl.retryAfterSeconds}s${tier === "FREE" ? " — or upgrade for higher limits." : "."}`,
      },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
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
