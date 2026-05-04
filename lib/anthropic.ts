import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Active model — override with ANTHROPIC_MODEL env var so you can bump the
 * model without a code deploy.  Falls back to claude-sonnet-4-20250514.
 */
export const MODEL =
  process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";

export interface LessonGenerationParams {
  subject: string;
  topic: string;
  yearGroup: string;
  childName: string;
  duration?: number;
  learningStyle?: string;
  previousKnowledge?: string;
}

export async function generateLesson(params: LessonGenerationParams) {
  const {
    subject,
    topic,
    yearGroup,
    childName,
    duration = 60,
    learningStyle,
    previousKnowledge,
  } = params;

  const prompt = `You are an expert UK homeschool curriculum planner. Create a detailed, engaging lesson plan for a UK homeschool family.

Child: ${childName}
Year Group: ${yearGroup} (UK curriculum)
Subject: ${subject}
Topic: ${topic}
Duration: ${duration} minutes
${learningStyle ? `Learning Style: ${learningStyle}` : ""}
${previousKnowledge ? `Previous Knowledge: ${previousKnowledge}` : ""}

Please generate a structured lesson plan in JSON format with these fields:
{
  "title": "Lesson title",
  "description": "Brief overview (2-3 sentences)",
  "objectives": ["Learning objective 1", "Learning objective 2", "Learning objective 3"],
  "activities": [
    {
      "title": "Activity name",
      "description": "What to do",
      "duration": 15,
      "order": 1
    }
  ],
  "resources": ["Resource or material needed"],
  "ukCurriculumLinks": ["National Curriculum link"],
  "extensionIdeas": ["Ideas for further exploration"],
  "assessmentSuggestions": "How to assess understanding"
}

Keep the language warm, encouraging, and appropriate for home education. Activities should be hands-on where possible.`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in response");

  return JSON.parse(jsonMatch[0]);
}
