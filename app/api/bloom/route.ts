import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getLevel,
  getNextLevel,
  getUnlockedElements,
  BADGE_DEFS,
  GARDEN_ELEMENTS,
} from "@/lib/bloom";
import { getUserTier, tierAtLeast } from "@/lib/subscription";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const childId = searchParams.get("childId");
  if (!childId) return NextResponse.json({ error: "childId required" }, { status: 400 });

  const child = await db.child.findFirst({
    where: { id: childId, userId: session.user.id },
  });
  if (!child) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tier = await getUserTier(session.user.id);
  const hasGarden = tierAtLeast(tier, "BASIC");

  // FREE users get the basic star count + level only — the garden, rewards,
  // and badges are a Basic-tier feature, so we strip them server-side rather
  // than rely on the client to hide them.
  if (!hasGarden) {
    const stars = child.bloomStars;
    return NextResponse.json({
      child: { id: child.id, name: child.name },
      stars,
      level: getLevel(stars),
      nextLevel: getNextLevel(stars),
      activeRewards: [],
      redeemedRewards: [],
      badges: [],
      gardenElements: [],
      tier,
      gardenLocked: true,
    });
  }

  const [rewards, earnedBadges] = await Promise.all([
    db.reward.findMany({
      where: { childId },
      orderBy: { createdAt: "asc" },
    }),
    db.badge.findMany({
      where: { childId },
      orderBy: { earnedAt: "asc" },
    }),
  ]);

  const stars = child.bloomStars;
  const level = getLevel(stars);
  const nextLevel = getNextLevel(stars);
  const unlockedElements = getUnlockedElements(stars);

  // Sort active rewards: nearest goal first (least stars remaining)
  const activeRewards = rewards
    .filter((r) => !r.redeemed)
    .sort((a, b) => {
      const aRemaining = Math.max(a.starsRequired - stars, 0);
      const bRemaining = Math.max(b.starsRequired - stars, 0);
      return aRemaining - bRemaining;
    });

  const redeemedRewards = rewards.filter((r) => r.redeemed);

  const earnedSet = new Set(earnedBadges.map((b) => b.badgeType));
  const badges = BADGE_DEFS.map((def) => {
    const earned = earnedBadges.find((b) => b.badgeType === def.type);
    return {
      ...def,
      earned: earnedSet.has(def.type),
      earnedAt: earned?.earnedAt.toISOString() ?? null,
    };
  });

  // Garden elements with unlock status
  const gardenElements = GARDEN_ELEMENTS.map((el) => ({
    ...el,
    unlocked: stars >= el.stars,
  }));

  return NextResponse.json({
    child: { id: child.id, name: child.name },
    stars,
    level,
    nextLevel,
    activeRewards: activeRewards.map((r) => ({
      id: r.id,
      name: r.name,
      starsRequired: r.starsRequired,
      starsRemaining: Math.max(r.starsRequired - stars, 0),
      ready: stars >= r.starsRequired,
    })),
    redeemedRewards: redeemedRewards.map((r) => ({
      id: r.id,
      name: r.name,
      starsRequired: r.starsRequired,
      redeemedAt: r.redeemedAt?.toISOString() ?? null,
    })),
    badges,
    gardenElements,
    tier,
    gardenLocked: false,
  });
}
