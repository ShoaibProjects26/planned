import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { PlannerView } from "@/components/planner/planner-view";

export const metadata = { title: "Planner" };

export default async function PlannerPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const children = await db.child.findMany({
    where: { userId: session.user.id },
    include: {
      lessons: {
        orderBy: { dayDate: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return <PlannerView children={children} />;
}
