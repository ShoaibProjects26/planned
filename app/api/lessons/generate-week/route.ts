import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { anthropic, MODEL } from "@/lib/anthropic";
import { getUserTier, freeWeekLimitReached, PAYWALL_RESPONSES } from "@/lib/subscription";
import { rateLimit } from "@/lib/rateLimit";

// Per-tier hourly limits for week generation. Each call burns an Anthropic
// request, so caps protect spend and bound spam abuse.
const WEEK_GEN_LIMITS = {
  FREE:    { limit: 3,  windowMs: 60 * 60 * 1000 },
  BASIC:   { limit: 10, windowMs: 60 * 60 * 1000 },
  PREMIUM: { limit: 30, windowMs: 60 * 60 * 1000 },
} as const;

export const dynamic = "force-dynamic";

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.valueOf() - yearStart.valueOf()) / 86400000) + 1) / 7);
}

// ─── Curriculum config ────────────────────────────────────────────────────────

const CURRICULUM_LABELS: Record<string, string> = {
  BNC:        "British National Curriculum",
  MONTESSORI: "Montessori",
  UNSCHOOLING: "Unschooling / Child-led",
};

/**
 * Returns the curriculum-specific section of the prompt — the part that tells
 * Claude how to structure the week and what kind of lessons to produce.
 */
function buildCurriculumPrompt(
  curriculum: string,
  yearGroup: string | null,
  interests: string,
  faith: string,
  faithIntegration: boolean,
): string {
  const faithLine =
    faith !== "SECULAR" && faithIntegration
      ? `Faith context: ${faith} — weave in naturally through stories, references, and examples where appropriate.`
      : `Faith context: secular approach — no religious content.`;

  if (curriculum === "MONTESSORI") {
    return `
Curriculum approach: Montessori

In Montessori homeschool the child works in long, uninterrupted "work periods" of 2–3 hours rather than short subject slots. Lessons are brief presentations (3-step lessons) that introduce a concept or material; the child then practises independently.

Structure the week as follows (dayOffset 0=Mon … 4=Fri):
- Each day has 3–4 "work period" entries, NOT traditional timed lessons.
- Subject names should reflect Montessori areas: "Practical Life", "Sensorial", "Mathematics", "Language", "Cultural Studies", "Arts & Crafts", "Outdoor / Nature".
- Topics should reference concrete Montessori materials where appropriate (e.g. "Golden Bead introduction", "Sandpaper Letters — b, d, p", "Binomial Cube exploration").
- durationMins should be 20–30 min for presentations; 45–60 min for independent work periods.
- Descriptions should describe what the parent presents and what the child does independently.
- Avoid bell-schedule thinking — no "Maths at 9, English at 10" style. Instead, describe the material and the 3-step lesson.
- Total: 15–18 work entries across the week.
${faithLine}
- Year group context (for material difficulty only): ${yearGroup ?? "primary"}
- Child's interests to incorporate into cultural/language work: ${interests}`;
  }

  if (curriculum === "UNSCHOOLING") {
    return `
Curriculum approach: Unschooling / Child-led learning

Unschooling follows the child's natural curiosity rather than a fixed timetable. There are no mandatory subjects. Learning emerges from the child's interests, real-life experiences, projects, and play.

Structure the week as follows:
- Organise the week around 2–3 **projects or themes** drawn from the child's interests: ${interests}.
- Each day has 2–4 entries that explore the theme through different lenses (reading, creating, experimenting, visiting, discussing, watching).
- Subject names should reflect the activity type: "Project Exploration", "Reading & Stories", "Creative Making", "Outdoor Learning", "Life Skills", "Field Trip Prep", "Reflection & Journaling".
- Topics should be specific and connected: e.g. if interested in dinosaurs — "Create a dinosaur timeline", "Write a story from a dinosaur's perspective", "Visit natural history museum prep".
- Descriptions should sound inviting and child-centred, written TO the parent as a facilitator, not instructor.
- durationMins: flexible, 20–60 min. Shorter for focused activities, longer for deep project work.
- Total: 12–15 entries across the week — fewer but richer than a structured curriculum.
${faithLine}
- Age/year group context (for language/complexity only): ${yearGroup ?? "primary"}`;
  }

  // Default: BNC
  const faithSubject =
    faith !== "SECULAR" && faithIntegration ? `Religious Studies / ${faith.charAt(0) + faith.slice(1).toLowerCase()}, ` : "";

  return `
Curriculum approach: British National Curriculum (BNC)

Follow a structured Mon–Fri timetable with dedicated subject slots.

Subject schedule per day:
- Monday (0):    Maths, English, History or Geography, ${faithSubject}Art
- Tuesday (1):   Maths, English, Science
- Wednesday (2): Maths, English, Music or Computing
- Thursday (3):  Maths, English, Science, Geography or History
- Friday (4):    Maths, English, PE or Outdoor Learning

That gives 4–5 lessons per day (20–25 total).
- durationMins: 30–45 min per lesson (Maths/English 45 min, others 30 min).
- All content age-appropriate for ${yearGroup ?? "primary"}.
- Connect to the child's interests where natural: ${interests}.
${faithLine}`;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { childId } = await req.json();
  if (!childId) {
    return NextResponse.json({ error: "childId required" }, { status: 400 });
  }

  const child = await db.child.findFirst({
    where: { id: childId, userId: session.user.id },
  });
  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 });
  }

  // ── Tier paywall ──────────────────────────────────────────────────────────
  const userTier = await getUserTier(session.user.id);
  if (userTier === "FREE") {
    const limitReached = await freeWeekLimitReached(session.user.id);
    if (limitReached) {
      return NextResponse.json(PAYWALL_RESPONSES.weekLimit(), { status: 403 });
    }
  }

  // ── Rate limit ────────────────────────────────────────────────────────────
  const { limit, windowMs } = WEEK_GEN_LIMITS[userTier];
  const rl = rateLimit(`gen-week:${session.user.id}`, limit, windowMs);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many generations. Try again in ${rl.retryAfterSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  const familyProfile = await db.familyProfile.findUnique({
    where: { userId: session.user.id },
  });

  const interests =
    safeParseJson(child.interests, []).join(", ") || "a variety of topics";
  const curriculum   = familyProfile?.curriculum ?? "BNC";
  const faith        = familyProfile?.faith ?? "SECULAR";
  const faithIntegration = familyProfile?.faithIntegration ?? false;
  const curriculumLabel  = CURRICULUM_LABELS[curriculum] ?? curriculum;

  const curriculumSection = buildCurriculumPrompt(
    curriculum,
    child.yearGroup,
    interests,
    faith,
    faithIntegration,
  );

  // ── Build the prompt ──────────────────────────────────────────────────────
  const prompt = `You are an expert UK homeschool curriculum planner. Generate a personalised week of lessons (Monday to Friday) for this child:

Name: ${child.name}
Age: ${child.age ?? "unknown"}
Year Group: ${child.yearGroup ?? "unknown"}
Learning style: ${child.learningStyle ?? "balanced"}
Curriculum: ${curriculumLabel}
${curriculumSection}

Return ONLY valid JSON — no markdown, no code fences, just the raw JSON object:
{
  "lessons": [
    {
      "dayOffset": 0,
      "subject": "Subject name",
      "topic": "Short specific topic (3-6 words)",
      "durationMins": 45,
      "title": "Engaging lesson title",
      "description": "2-3 sentences describing the activity in an engaging, warm way for a homeschool parent to read. Make it specific to this child's interests and year group.",
      "objectives": ["Objective 1", "Objective 2", "Objective 3"]
    }
  ]
}

dayOffset: 0=Monday, 1=Tuesday, 2=Wednesday, 3=Thursday, 4=Friday

Important rules:
- Follow the curriculum approach described above — do NOT use a BNC timetable for Montessori or Unschooling.
- Make objectives measurable and age-appropriate for ${child.yearGroup ?? "primary age"}.
- Descriptions should be warm, specific, and refer to ${child.name} by name.
- Connect to interests (${interests}) wherever natural.`;

  // ── Call Claude ───────────────────────────────────────────────────────────
  let message;
  try {
    message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Anthropic API error";
    console.error("[generate-week] Anthropic error:", msg);
    return NextResponse.json(
      { error: "AI generation failed. Please try again in a moment.", detail: msg },
      { status: 502 },
    );
  }

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  // Strip markdown fences if Claude added them
  const stripped = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const jsonMatch = stripped.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("[generate-week] No JSON in response:", text.slice(0, 300));
    return NextResponse.json(
      { error: "AI returned an unexpected response. Please try again." },
      { status: 500 },
    );
  }

  let parsed: {
    lessons: {
      dayOffset: number;
      subject: string;
      topic: string;
      durationMins: number;
      title: string;
      description: string;
      objectives: string[];
    }[];
  };

  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return NextResponse.json(
      { error: "AI response could not be parsed. Please try again." },
      { status: 500 },
    );
  }

  if (!Array.isArray(parsed.lessons) || parsed.lessons.length === 0) {
    return NextResponse.json(
      { error: "AI returned an empty lesson plan. Please try again." },
      { status: 500 },
    );
  }

  // ── Persist to database ───────────────────────────────────────────────────
  const monday     = getMondayOfWeek(new Date());
  const weekNumber = getISOWeek(monday);
  const weekEnd    = new Date(monday);
  weekEnd.setDate(monday.getDate() + 7);

  // Remove any existing lessons for this week to avoid duplicates
  await db.lesson.deleteMany({
    where: { childId, dayDate: { gte: monday, lt: weekEnd } },
  });

  const created = await db.$transaction(
    parsed.lessons.map((lesson) => {
      const lessonDate = new Date(monday);
      lessonDate.setDate(monday.getDate() + Math.min(Math.max(lesson.dayOffset, 0), 4));
      lessonDate.setHours(9, 0, 0, 0);

      return db.lesson.create({
        data: {
          childId,
          subject:    lesson.subject,
          topic:      lesson.topic,
          dayDate:    lessonDate,
          weekNumber,
          termNumber: 1,
          durationMins: lesson.durationMins ?? 45,
          status: "PENDING",
          generatedContent: JSON.stringify({
            title:       lesson.title,
            description: lesson.description,
            objectives:  lesson.objectives ?? [],
          }),
        },
      });
    }),
  );

  return NextResponse.json({ count: created.length, curriculum });
}

function safeParseJson(str: string, fallback: unknown) {
  try { return JSON.parse(str); }
  catch { return fallback; }
}
