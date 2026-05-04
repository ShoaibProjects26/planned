import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user, familyProfile, childCount, weekCount] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id:                   true,
        name:                 true,
        email:                true,
        location:             true,
        subscriptionTier:     true,
        subscriptionStatus:   true,
        stripeCustomerId:     true,
        passwordHash:         true,
      },
    }),
    db.familyProfile.findUnique({
      where: { userId: session.user.id },
      select: { curriculum: true, faith: true, faithIntegration: true },
    }),
    db.child.count({ where: { userId: session.user.id } }),
    // Count distinct weeks that have lessons
    db.lesson.findMany({
      where: { child: { userId: session.user.id } },
      select: { weekNumber: true, termNumber: true },
      distinct: ["weekNumber", "termNumber"],
    }).then((rows) => rows.length),
  ]);

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    user: {
      id:                 user.id,
      name:               user.name,
      email:              user.email,
      location:           user.location,
      subscriptionTier:   user.subscriptionTier,
      subscriptionStatus: user.subscriptionStatus,
      stripeCustomerId:   user.stripeCustomerId,
      hasPassword:        !!user.passwordHash,
    },
    familyProfile,
    childCount,
    usageWeeks: weekCount,
  });
}
