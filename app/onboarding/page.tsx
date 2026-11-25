import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, googleAuthEnabled } from "@/lib/auth";
import { db } from "@/lib/db";
import { OnboardingWizard } from "./onboarding-wizard";

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user?.id
    ? await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        termsAcceptedAt: true,
        familyProfile: { select: { id: true } },
      },
    })
    : null;

  if (user?.termsAcceptedAt && user.familyProfile) redirect("/dashboard");

  return (
    <OnboardingWizard
      googleEnabled={googleAuthEnabled}
      account={user ? { name: user.name ?? "", email: user.email ?? "" } : null}
      needsConsent={!!user && !user.termsAcceptedAt}
    />
  );
}
