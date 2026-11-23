import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { VerifyEmailBanner } from "@/components/layout/verify-email-banner";

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
      select: {
        subscriptionTier: true,
        termsAcceptedAt: true,
        email: true,
        emailVerified: true,
      },
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

  if (!user) redirect("/auth/signin");

  // Accounts created before consent existed (or via Google) must accept the
  // Terms + Privacy Policy before using the app.
  if (!user.termsAcceptedAt) redirect("/auth/consent");

  return (
    <DashboardShell
      allChildren={children_}
      subscriptionTier={user.subscriptionTier ?? "FREE"}
    >
      {!user.emailVerified && user.email && <VerifyEmailBanner email={user.email} />}
      {children}
    </DashboardShell>
  );
}
