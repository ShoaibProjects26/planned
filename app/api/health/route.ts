import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { aiConfigured } from "@/lib/ai";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — for uptime monitors (e.g. Better Stack, UptimeRobot).
 * Returns 200 when the app and database are reachable, 503 otherwise.
 * Reports only whether config is present, never its values.
 */
export async function GET() {
  const started = Date.now();
  let database = false;
  try {
    await db.$queryRaw`SELECT 1`;
    database = true;
  } catch {
    database = false;
  }

  const body = {
    status: database ? "ok" : "degraded",
    database,
    latencyMs: Date.now() - started,
    config: {
      ai: aiConfigured(),
      email: !!process.env.RESEND_API_KEY,
      blob: !!process.env.BLOB_READ_WRITE_TOKEN,
      botProtection: !!process.env.TURNSTILE_SECRET_KEY,
      payments: process.env.PAYMENTS_ENABLED === "true",
    },
    time: new Date().toISOString(),
  };

  return NextResponse.json(body, {
    status: database ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
