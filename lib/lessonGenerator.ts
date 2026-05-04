import { anthropic, MODEL } from "@/lib/anthropic";
import { db } from "@/lib/db";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TeachingStep {
  step: number;
  title: string;
  instructions: string;
}

export type ActivityType = "Drawing" | "Worksheet" | "Hands-on" | "Discussion";

export interface Activity {
  title: string;
  type: ActivityType;
  description: string;
  durationMins?: number;
}

export interface VideoResource {
  title: string;
  searchQuery: string;
}

export interface FaithConnection {
  reference: string;
  arabicText?: string;
  translation?: string;
  explanation: string;
}

export interface DayOut {
  venueName: string;
  description: string;
  address: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface FullLessonContent {
  title: string;
  description: string;
  objectives: string[];
  teachingGuide: TeachingStep[];
  activities: Activity[];
  videoResources: VideoResource[];
  faithConnection?: FaithConnection;
  dayOut?: DayOut;
  quiz: QuizQuestion[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeParseJson<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

const CURRICULUM_LABELS: Record<string, string> = {
  BNC:         "British National Curriculum",
  MONTESSORI:  "Montessori",
  UNSCHOOLING: "Unschooling / Child-led",
};

const FAITH_LABELS: Record<string, string> = {
  ISLAM:        "Islam",
  CHRISTIANITY: "Christianity",
  JUDAISM:      "Judaism",
};

/**
 * Returns curriculum-specific instructions that shape the tone, structure, and
 * content of the teaching guide and activities.
 */
function curriculumApproachSection(curriculum: string, childName: string): string {
  if (curriculum === "MONTESSORI") {
    return `
CURRICULUM APPROACH — MONTESSORI:
- The teachingGuide should follow the 3-Period Lesson structure:
    Step 1 "Naming" — introduce the material/concept with a concrete object or manipulative ("This is…")
    Step 2 "Recognition" — ask ${childName} to identify/point/show ("Can you show me…?")
    Step 3 "Recall" — ${childName} names it independently ("What is this?")
- Activities must be hands-on and use concrete materials before abstract representation.
  Suggest specific Montessori materials where applicable (e.g. number rods, sandpaper letters, bead chains).
- The parent's role is as a calm observer/guide, NOT a lecturer. Instructions should reflect this.
- Include an "independent work period" activity where ${childName} can practise alone.
- No worksheets as the primary activity — if a worksheet is used, it comes AFTER concrete work.
- Assessment is observational: describe what the parent should watch for, not a written test.`;
  }

  if (curriculum === "UNSCHOOLING") {
    return `
CURRICULUM APPROACH — UNSCHOOLING / CHILD-LED:
- The teachingGuide should NOT be a formal lesson sequence. Instead it should be a facilitation guide:
    Step 1 "Spark curiosity" — a question, story, or real-world trigger that invites exploration
    Step 2 "Follow the thread" — how to follow ${childName}'s questions and expand them
    Step 3 "Create or do" — a self-chosen project, experiment, or creative output
    Step 4 "Reflect together" — informal conversation questions, NOT a quiz
- Activities should be project-based, interest-led, and feel like play or real life — not school.
- Avoid the word "lesson". Use "exploration", "project", "discovery", "investigation".
- Objectives should be framed as possibilities, not requirements: "may discover…", "might explore…"
- The quiz section should still be generated but frame questions as "conversation starters" rather than a test.
- Materials should be everyday objects, library books, or free online resources — not worksheets.`;
  }

  // BNC (default)
  return `
CURRICULUM APPROACH — BRITISH NATIONAL CURRICULUM:
- The teachingGuide should follow a clear instructional sequence: hook → direct instruction → guided practice → independent practice → plenary.
- Reference National Curriculum attainment targets where relevant (e.g. "KS2 Maths — number and place value").
- Activities may include worksheets, written work, and structured exercises alongside hands-on tasks.
- Objectives must be specific and measurable against NC year-group expectations.
- The quiz tests recall and application at the appropriate year-group level.`;
}

// ─── Core generator ───────────────────────────────────────────────────────────

export async function generateLesson(
  childId: string,
  subject: string,
  topic: string
): Promise<FullLessonContent> {
  // Fetch child + user + family profile
  const child = await db.child.findUnique({
    where: { id: childId },
    include: {
      user: {
        select: {
          location: true,
          familyProfile: true,
        },
      },
    },
  });

  if (!child) throw new Error("Child not found");

  const fp = child.user.familyProfile;
  const interests =
    safeParseJson<string[]>(child.interests, []).join(", ") ||
    "a variety of topics";
  const curriculum = fp?.curriculum ?? "BNC";
  const faith = fp?.faith ?? "SECULAR";
  const faithIntegration = fp?.faithIntegration ?? false;
  const location = child.user.location ?? "United Kingdom";

  const includeFaith = faith !== "SECULAR" && faithIntegration;
  const faithLabel = FAITH_LABELS[faith] ?? faith;
  const curriculumLabel = CURRICULUM_LABELS[curriculum] ?? curriculum;
  const approachSection = curriculumApproachSection(curriculum, child.name);

  const faithBlock = includeFaith
    ? `
  "faithConnection": {
    "reference": "A relevant ${faithLabel} reference (e.g. Quran verse, Hadith, Bible verse, or Torah passage)",
    "arabicText": "Original Arabic/Hebrew text if applicable — empty string if not",
    "translation": "Clear English translation",
    "explanation": "2-3 sentences connecting this ${faithLabel} teaching naturally and gently to the lesson topic of ${topic}"
  },`
    : "";

  const prompt = `You are an expert UK homeschool curriculum planner and lesson designer. Create a detailed, engaging lesson for a child to be taught at home by their parent.

CHILD PROFILE:
- Name: ${child.name}
- Age: ${child.age ?? "primary school age"}
- Year Group: ${child.yearGroup ?? "primary"}
- Curriculum: ${curriculumLabel}
- Learning Style: ${child.learningStyle ?? "balanced"}
- Interests: ${interests}
- Literacy level: ${child.literacyLevel ?? "age-appropriate"}
- Numeracy level: ${child.numeracyLevel ?? "age-appropriate"}
- Reasoning level: ${child.reasoningLevel ?? "age-appropriate"}

LESSON:
- Subject: ${subject}
- Topic: ${topic}

FAMILY:
- Faith: ${includeFaith ? `${faithLabel} (weave in naturally)` : "secular — no religious content"}
- Location: ${location}
${approachSection}

Return ONLY valid JSON — no markdown, no code fences, just the raw JSON object:
{
  "title": "Engaging, specific lesson title for this topic",
  "description": "2-3 sentences that paint a vivid picture of what ${child.name} will do and discover today.",
  "objectives": [
    "By the end of this lesson, ${child.name} will be able to [measurable outcome 1]",
    "By the end of this lesson, ${child.name} will be able to [measurable outcome 2]",
    "By the end of this lesson, ${child.name} will be able to [measurable outcome 3]",
    "By the end of this lesson, ${child.name} will be able to [measurable outcome 4]"
  ],
  "teachingGuide": [
    {
      "step": 1,
      "title": "Warm Up (5 min)",
      "instructions": "Detailed instructions for the parent — exactly what to say, ask, and do. Include suggested questions and expected responses. 4-5 sentences."
    },
    {
      "step": 2,
      "title": "Introduce the Concept (10 min)",
      "instructions": "Explain the core idea step by step. What to show, demonstrate, or explain. Include a real-world analogy. 4-5 sentences."
    },
    {
      "step": 3,
      "title": "Guided Practice (15 min)",
      "instructions": "Walk through the main activity together. What to do, watch for, and how to support ${child.name}. 4-5 sentences."
    },
    {
      "step": 4,
      "title": "Wrap Up & Reflect (5 min)",
      "instructions": "How to consolidate learning. Suggested questions to check understanding. How to celebrate what ${child.name} achieved. 4-5 sentences."
    }
  ],
  "activities": [
    {
      "title": "Activity name",
      "type": "Hands-on",
      "description": "Clear, step-by-step instructions for the activity. What materials are needed. What ${child.name} should produce. 3-4 sentences.",
      "durationMins": 15
    },
    {
      "title": "Activity name",
      "type": "Drawing",
      "description": "Clear instructions. What to draw, label, or create. How it connects to the lesson. 3-4 sentences.",
      "durationMins": 10
    }
  ],
  "videoResources": [
    {
      "title": "Descriptive title so parent knows what the video covers",
      "searchQuery": "specific YouTube search query to find the best video"
    },
    {
      "title": "Second video title",
      "searchQuery": "second YouTube search query"
    }
  ],${faithBlock}
  "dayOut": {
    "venueName": "Specific named venue near ${location} — museum, science centre, nature reserve, historic site, etc.",
    "description": "2-3 sentences explaining why this venue brings the lesson topic to life and what ${child.name} will experience there.",
    "address": "Full UK address including postcode"
  },
  "quiz": [
    {
      "question": "Specific question testing understanding of ${topic}",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0
    },
    {
      "question": "Another question at an appropriate level for ${child.yearGroup ?? "this year group"}",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 2
    }
  ]
}

Rules:
- Activity type MUST be exactly one of: Drawing, Worksheet, Hands-on, Discussion
- correctIndex is 0-based (0 = first option)
- All content must be age-appropriate for ${child.yearGroup ?? "primary school"}
- Teaching instructions should feel warm, encouraging, and practical for a home setting
- Connect to ${child.name}'s interests (${interests}) where natural
- Follow the CURRICULUM APPROACH section above — do not default to a BNC-style lesson if the curriculum is Montessori or Unschooling`;

  // ── Call Claude ─────────────────────────────────────────────────────────
  let message;
  try {
    message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`Anthropic API error: ${detail}`);
  }

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  // Strip any markdown code fences if Claude added them
  const stripped = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const jsonMatch = stripped.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("[lessonGenerator] No JSON in response:", text.slice(0, 300));
    throw new Error("AI returned an unexpected response — please try again");
  }

  try {
    return JSON.parse(jsonMatch[0]) as FullLessonContent;
  } catch {
    throw new Error("AI response could not be parsed — please try again");
  }
}
