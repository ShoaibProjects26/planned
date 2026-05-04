import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  const [user, children_] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: { subscriptionTier: true },
    }),
    db.child.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        name: true,
        age: true,
        yearGroup: true,
        bloomStars: true,
        learningStyle: true,
        interests: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <DashboardShell
      allChildren={children_}
      subscriptionTier={user?.subscriptionTier ?? "FREE"}
    >
      {children}
    </DashboardShell>
  );
}
