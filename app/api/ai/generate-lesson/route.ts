import { NextResponse } from "next/server";

/**
 * DISABLED (security audit): this endpoint was not used by any page and
 * accepted an arbitrary child name/topic from the request body, making it a
 * free, open-ended AI generator. Lesson generation goes through
 * /api/lessons/generate-week and /api/lessons/[id]/generate-detail, which
 * check child ownership, consent and quotas. Safe to delete this file.
 */
export async function POST() {
  return NextResponse.json({ error: "This endpoint has been removed." }, { status: 410 });
}
