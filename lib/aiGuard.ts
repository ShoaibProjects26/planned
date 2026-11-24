/**
 * Single gate every AI-calling route goes through before spending money or
 * sending a child's data to the AI provider. Checks, in order:
 *
 *   1. Parental AI consent        — User.aiConsentAt must be set.
 *   2. Per-feature hourly limit   — stops rapid-fire abuse of one endpoint.  ┐ only when
 *   3. Per-user daily quota       — caps total AI calls per family per day.  ┘ AI_USER_LIMITS_ENABLED="true"
 *   4. Global daily cap           — hard spending backstop across ALL users.
 *
 * All counters live in Postgres (see lib/rateLimit.ts), so they hold across
 * serverless instances. Returns a Response to send back, or null to proceed.
 */

import { db } from "@/lib/db";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";
import type { Tier } from "@/lib/stripe";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export type AiFeature = "gen-week" | "detail" | "refine" | "worksheet" | "chat" | "note";

/** Hourly limit per feature, per tier. */
const HOURLY: Record<AiFeature, Record<Tier, number>> = {
  "gen-week": { FREE: 5,  BASIC: 15, PREMIUM: 30 },
  detail:     { FREE: 15, BASIC: 40, PREMIUM: 80 },
  refine:     { FREE: 5,  BASIC: 20, PREMIUM: 40 },
  worksheet:  { FREE: 0,  BASIC: 20, PREMIUM: 40 },
  chat:       { FREE: 0,  BASIC: 0,  PREMIUM: 60 },
  note:       { FREE: 10, BASIC: 20, PREMIUM: 40 },
};

/** Total AI calls per user per rolling 24h, across every feature. */
const DAILY_QUOTA: Record<Tier, number> = {
  FREE: 40,
  BASIC: 150,
  PREMIUM: 300,
};

/** App-wide AI calls per rolling 24h. Override with AI_GLOBAL_DAILY_LIMIT. */
function globalDailyLimit() {
  const n = Number(process.env.AI_GLOBAL_DAILY_LIMIT);
  return Number.isFinite(n) && n > 0 ? n : 5000;
}

export const AI_CONSENT_REQUIRED = {
  error:
    "AI lesson planning is switched off for your account. To use it, give consent in Settings → Privacy & data.",
  consentRequired: true,
} as const;

export async function guardAiRequest(
  userId: string,
  tier: Tier,
  feature: AiFeature,
): Promise<Response | null> {
  // 1. Consent
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { aiConsentAt: true },
  });
  if (!user?.aiConsentAt) {
    return Response.json(AI_CONSENT_REQUIRED, { status: 403 });
  }

  if (userLimitsEnabled()) {
    const blocked = await checkUserLimits(userId, tier, feature);
    if (blocked) return blocked;
  }

  // 4. Global spending backstop (always on)
  const global = await rateLimit("ai:global", globalDailyLimit(), DAY);
  if (!global.ok) {
    console.error("[aiGuard] GLOBAL daily AI cap reached — all AI requests are being refused");
    return Response.json(
      { error: "Lesson generation is very busy right now. Please try again later." },
      { status: 503, headers: { "Retry-After": String(global.retryAfterSeconds) } },
    );
  }

  return null;
}

/**
 * Per-user limits (steps 2 and 3) are OFF unless AI_USER_LIMITS_ENABLED="true".
 * Turned off during early testing; switch on before public launch.
 * Plan paywalls are enforced in each route, not here, so they still apply.
 */
function userLimitsEnabled() {
  return process.env.AI_USER_LIMITS_ENABLED === "true";
}

async function checkUserLimits(
  userId: string,
  tier: Tier,
  feature: AiFeature,
): Promise<Response | null> {
  // 2. Per-feature hourly limit
  const hourly = await rateLimit(`ai:${feature}:${userId}`, HOURLY[feature][tier], HOUR);
  if (!hourly.ok) {
    return tooManyRequests(
      hourly.retryAfterSeconds,
      `You've reached the hourly limit for this feature. Try again in ${formatWait(hourly.retryAfterSeconds)}.`,
    );
  }

  // 3. Per-user daily quota
  const daily = await rateLimit(`ai:daily:${userId}`, DAILY_QUOTA[tier], DAY);
  if (!daily.ok) {
    return tooManyRequests(
      daily.retryAfterSeconds,
      `You've reached today's AI limit for your plan. Try again in ${formatWait(daily.retryAfterSeconds)}.`,
    );
  }

  return null;
}

function formatWait(seconds: number) {
  if (seconds < 90) return `${seconds}s`;
  const mins = Math.ceil(seconds / 60);
  if (mins < 90) return `${mins} minutes`;
  return `${Math.ceil(mins / 60)} hours`;
}
