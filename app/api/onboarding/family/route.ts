import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const familySchema = z.object({
  goals: z.array(z.string()).min(1, "Select at least one goal"),
  curriculum: z.enum(["BNC", "MONTESSORI", "UNSCHOOLING"]),
  faith: z.enum(["ISLAM", "CHRISTIANITY", "JUDAISM", "SECULAR"]),
  faithIntegration: z.boolean(),
  location: z.string().min(2, "Please enter your town or city"),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await req.json();
  const result = familySchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    );
  }

  const { goals, curriculum, faith, faithIntegration, location } = result.data;

  const profile = await db.familyProfile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      goals: JSON.stringify(goals),
      curriculum,
      faith,
      faithIntegration,
    },
    update: {
      goals: JSON.stringify(goals),
      curriculum,
      faith,
      faithIntegration,
    },
  });

  await db.user.update({
    where: { id: session.user.id },
    data: { location },
  });

  return NextResponse.json({ profile });
}
