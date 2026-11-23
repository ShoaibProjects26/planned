import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ChildrenView } from "@/components/planner/children-view";

export const metadata = { title: "Children" };

export default async function ChildrenPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const children = await db.child.findMany({
    where: { userId: session.user.id },
    include: {
      badges: true,
      lessons: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return <ChildrenView children={children} />;
}
