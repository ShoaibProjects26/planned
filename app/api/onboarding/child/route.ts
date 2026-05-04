import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { getUserTier, getChildCount, PAYWALL_RESPONSES } from "@/lib/subscription";
import { PLANS } from "@/lib/stripe";

const childSchema = z.object({
  name: z.string().min(1, "Name is required"),
  age: z.number().int().min(4).max(11),
  yearGroup: z.string().optional(),
  interests: z.array(z.string()),
  learningStyle: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await req.json();
  const result = childSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    );
  }

  const { name, age, yearGroup, interests, learningStyle } = result.data;

  // ── Tier paywall: check child limit ────────────────────────────────────────
  const [userTier, childCount] = await Promise.all([
    getUserTier(session.user.id),
    getChildCount(session.user.id),
  ]);
  const limit = PLANS[userTier as keyof typeof PLANS]?.limits.children ?? 1;
  if (limit !== -1 && childCount >= limit) {
    return NextResponse.json(PAYWALL_RESPONSES.childLimit(userTier as "FREE" | "BASIC"), { status: 403 });
  }

  const child = await db.child.create({
    data: {
      userId: session.user.id,
      name,
      age,
      yearGroup: yearGroup ?? ageToYearGroup(age),
      interests: JSON.stringify(interests),
      learningStyle,
    },
  });

  return NextResponse.json({ child }, { status: 201 });
}

function ageToYearGroup(age: number): string {
  const map: Record<number, string> = {
    4: "Reception",
    5: "Year 1",
    6: "Year 2",
    7: "Year 3",
    8: "Year 4",
    9: "Year 5",
    10: "Year 6",
    11: "Year 7",
  };
  return map[age] ?? "Year 1";
}
