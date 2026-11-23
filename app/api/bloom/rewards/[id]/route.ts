import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/bloom/rewards/[id] — redeem (give reward)
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reward = await db.reward.findFirst({
    where: { id: params.id, child: { userId: session.user.id } },
    include: { child: true },
  });
  if (!reward) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (reward.redeemed) {
    return NextResponse.json({ error: "Already redeemed" }, { status: 409 });
  }

  if (reward.child.bloomStars < reward.starsRequired) {
    return NextResponse.json(
      { error: "Not enough stars" },
      { status: 422 }
    );
  }

  const updated = await db.reward.update({
    where: { id: params.id },
    data: { redeemed: true, redeemedAt: new Date() },
  });

  return NextResponse.json({ reward: updated });
}

// DELETE /api/bloom/rewards/[id] — remove reward
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reward = await db.reward.findFirst({
    where: { id: params.id, child: { userId: session.user.id } },
  });
  if (!reward) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.reward.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}
