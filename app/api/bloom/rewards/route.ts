import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserTier, tierAtLeast } from "@/lib/subscription";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tier = await getUserTier(session.user.id);
  if (!tierAtLeast(tier, "BASIC")) {
    return NextResponse.json(
      {
        error: "Reward goals are a Basic feature. Upgrade to set up rewards.",
        paywall: true,
        requiredTier: "BASIC",
      },
      { status: 403 },
    );
  }

  const { childId, name, starsRequired } = await req.json();
  if (!childId || !name || !starsRequired) {
    return NextResponse.json(
      { error: "childId, name, and starsRequired are required" },
      { status: 400 }
    );
  }

  const child = await db.child.findFirst({
    where: { id: childId, userId: session.user.id },
  });
  if (!child) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const reward = await db.reward.create({
    data: {
      childId,
      name: name.trim(),
      starsRequired: Math.max(parseInt(starsRequired, 10) || 1, 1),
    },
  });

  return NextResponse.json({ reward }, { status: 201 });
}
