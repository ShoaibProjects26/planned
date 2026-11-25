import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions, googleAuthEnabled } from "@/lib/auth";
import { db } from "@/lib/db";
import { OnboardingWizard } from "./onboarding-wizard";

/**
 * Entry point for sign-up — and where Google sign-in/sign-up returns to.
 *   - Not signed in               → create-account step (email or Google)
 *   - Signed in, Terms not yet accepted (new Google user) → consent step
 *   - Signed in, Terms accepted, setup unfinished         → resume at step 2
 *   - Signed in and fully set up                          → dashboard
 */
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
