/**
 * Subscription tier utilities — used in API routes and page components
 * to enforce per-tier limits and render paywalls.
 */

import { db } from "@/lib/db";
import { PLANS, type Tier } from "@/lib/stripe";

// ─── Tier helpers ─────────────────────────────────────────────────────────────

export function getTierLimits(tier: string) {
  const plan = PLANS[(tier as Tier) ?? "FREE"] ?? PLANS.FREE;
  return plan.limits;
}

export function tierAtLeast(userTier: string, required: Tier): boolean {
  const order: Tier[] = ["FREE", "BASIC", "PREMIUM"];
  return order.indexOf(userTier as Tier) >= order.indexOf(required);
}

// ─── Database checks ──────────────────────────────────────────────────────────

/** Returns the user's current subscription tier. */
export async function getUserTier(userId: string): Promise<Tier> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true, subscriptionStatus: true },
  });
  if (!user) return "FREE";

  // Treat non-active subscriptions as FREE
  const active = ["ACTIVE", "TRIALING"].includes(user.subscriptionStatus ?? "");
  if (!active && user.subscriptionTier !== "FREE") return "FREE";

  return (user.subscriptionTier as Tier) ?? "FREE";
}

/** Returns number of children for the given user. */
export async function getChildCount(userId: string): Promise<number> {
  return db.child.count({ where: { userId } });
}

/**
 * Returns whether the FREE-tier user has already generated a non-current week.
 * FREE tier can only have lessons for the current ISO week active at once.
 */
export async function freeWeekLimitReached(userId: string): Promise<boolean> {
  // Find children belonging to this user
  const children = await db.child.findMany({
    where: { userId },
    select: { id: true },
  });
  const childIds = children.map((c) => c.id);
  if (!childIds.length) return false;

  const now = new Date();
  // ISO week number for today
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  // Count lessons outside this week
  const outsideCurrentWeek = await db.lesson.count({
    where: {
      childId: { in: childIds },
      dayDate: {
        notIn: [], // workaround — use OR instead
      },
    },
  });

  // Simpler check: does any lesson exist outside the current week?
  const futureLesson = await db.lesson.findFirst({
    where: {
      childId: { in: childIds },
      dayDate: { gt: endOfWeek },
    },
  });

  return !!futureLesson;
}

// ─── Response helpers for API routes ─────────────────────────────────────────

export const PAYWALL_RESPONSES = {
  childLimit: (tier: Tier) => ({
    error:
      tier === "FREE"
        ? "Free plan is limited to 1 child. Upgrade to Basic to add up to 2 children."
        : "Basic plan is limited to 2 children. Upgrade to Premium for unlimited children.",
    paywall: true,
    requiredTier: tier === "FREE" ? "BASIC" : "PREMIUM",
  }),
  weekLimit: () => ({
    error: "Free plan can only generate 1 week of lessons at a time. Upgrade to Basic to plan a full month ahead.",
    paywall: true,
    requiredTier: "BASIC",
  }),
  journalPdf: () => ({
    error: "PDF export is a Premium feature.",
    paywall: true,
    requiredTier: "PREMIUM",
  }),
} as const;
