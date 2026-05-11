import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserTier, tierAtLeast } from "@/lib/subscription";
import { generateWorksheet, type WorksheetContent } from "@/lib/worksheetGenerator";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const WORKSHEET_PAYWALL = {
  error: "Worksheets are a Basic feature. Upgrade to Basic to generate one.",
  paywall: true,
  requiredTier: "BASIC" as const,
};

// Worksheet generation is a full AI call — reuse the same per-tier budget
// pattern as the rest of the AI endpoints but on a separate bucket.
const WORKSHEET_LIMITS = {
  FREE:    { limit: 5,  windowMs: 60 * 60 * 1000 },
  BASIC:   { limit: 20, windowMs: 60 * 60 * 1000 },
  PREMIUM: { limit: 60, windowMs: 60 * 60 * 1000 },
} as const;

interface CachedContent {
  worksheet?: WorksheetContent;
  worksheetAnswers?: Record<number, string | number>;
  [k: string]: unknown;
}

function safeParse(s: string): CachedContent {
  try { return JSON.parse(s); } catch { return {}; }
}

/**
 * GET /api/lessons/[id]/worksheet
 * Returns the cached worksheet content if one exists, plus any saved
 * answers (Premium only — Basic doesn't track answers).
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tier = await getUserTier(session.user.id);
  if (!tierAtLeast(tier, "BASIC")) {
    return NextResponse.json(WORKSHEET_PAYWALL, { status: 403 });
  }

  const lesson = await db.lesson.findFirst({
    where: { id: params.id, child: { userId: session.user.id } },
  });
  if (!lesson) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = safeParse(lesson.generatedContent);
  return NextResponse.json({
    tier,
    worksheet: parsed.worksheet ?? null,
    answers: tier === "PREMIUM" ? parsed.worksheetAnswers ?? {} : {},
    lessonTitle: typeof parsed.title === "string" ? parsed.title : lesson.topic,
  });
}

/**
 * POST /api/lessons/[id]/worksheet
 * Generates a fresh worksheet (replacing any cached one) and persists it
 * back to the lesson's generatedContent JSON.
 */
export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tier = await getUserTier(session.user.id);
  if (!tierAtLeast(tier, "BASIC")) {
    return NextResponse.json(WORKSHEET_PAYWALL, { status: 403 });
  }

  const { limit, windowMs } = WORKSHEET_LIMITS[tier];
  const rl = rateLimit(`worksheet:${session.user.id}`, limit, windowMs);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many worksheet generations. Try again in ${rl.retryAfterSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  const lesson = await db.lesson.findFirst({
    where: { id: params.id, child: { userId: session.user.id } },
    include: { child: true, objectives: true },
  });
  if (!lesson) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = safeParse(lesson.generatedContent);

  let worksheet: WorksheetContent;
  try {
    worksheet = await generateWorksheet(
      {
        childName: lesson.child.name,
        yearGroup: lesson.child.yearGroup,
        subject: lesson.subject,
        topic: lesson.topic,
        lessonTitle: typeof parsed.title === "string" ? parsed.title : lesson.topic,
        lessonDescription:
          typeof parsed.description === "string" ? parsed.description : "",
        objectives: lesson.objectives.map((o) => o.text),
      },
      // Caller is guaranteed to be at least BASIC at this point.
      tier === "PREMIUM" ? "PREMIUM" : "BASIC",
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Worksheet generation failed";
    console.error("[worksheet]", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  // Persist alongside the existing lesson content. Clear any old answers
  // since the questions just changed.
  const updated = { ...parsed, worksheet, worksheetAnswers: {} };
  await db.lesson.update({
    where: { id: lesson.id },
    data: { generatedContent: JSON.stringify(updated) },
  });

  return NextResponse.json({ worksheet, answers: {}, tier });
}

/**
 * PUT /api/lessons/[id]/worksheet
 * Save in-app answers (Premium only). Body: { answers: { [index]: value } }.
 */
export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tier = await getUserTier(session.user.id);
  if (tier !== "PREMIUM") {
    return NextResponse.json(
      {
        error: "In-app worksheet answers are a Premium feature. Basic users can still print.",
        paywall: true,
        requiredTier: "PREMIUM" as const,
      },
      { status: 403 },
    );
  }

  let answers: Record<string, string | number>;
  try {
    const body = await req.json();
    answers = body.answers ?? {};
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const lesson = await db.lesson.findFirst({
    where: { id: params.id, child: { userId: session.user.id } },
  });
  if (!lesson) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = safeParse(lesson.generatedContent);
  if (!parsed.worksheet) {
    return NextResponse.json(
      { error: "Generate a worksheet first" },
      { status: 400 },
    );
  }

  const updated = { ...parsed, worksheetAnswers: answers };
  await db.lesson.update({
    where: { id: lesson.id },
    data: { generatedContent: JSON.stringify(updated) },
  });

  return NextResponse.json({ ok: true, answers });
}
