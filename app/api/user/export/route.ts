import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { appUrl } from "@/lib/email";

export const dynamic = "force-dynamic";

function parseJson(s: string | null | undefined) {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return s; }
}

/**
 * GET /api/user/export
 *
 * Subject-access / data-portability export: everything we hold about the
 * parent and their children, as a downloadable JSON file. Secrets (password
 * hash, OAuth tokens, Stripe IDs) are excluded. Photos are listed as links
 * the signed-in parent can open.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await rateLimit(`export:${session.user.id}`, 10, 60 * 60 * 1000);
  if (!rl.ok) return tooManyRequests(rl.retryAfterSeconds);

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      location: true,
      subscriptionTier: true,
      subscriptionStatus: true,
      termsAcceptedAt: true,
      termsVersion: true,
      aiConsentAt: true,
      createdAt: true,
      updatedAt: true,
      accounts: { select: { provider: true } },
      familyProfile: true,
      conversations: {
        include: { messages: { orderBy: { createdAt: "asc" } } },
        orderBy: { createdAt: "asc" },
      },
      children: {
        orderBy: { createdAt: "asc" },
        include: {
          lessons: { include: { objectives: true }, orderBy: { dayDate: "asc" } },
          journalEntries: { orderBy: { entryDate: "asc" } },
          progress: true,
          rewards: true,
          badges: true,
          externalActivities: { orderBy: { activityDate: "asc" } },
        },
      },
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const base = appUrl();
  const exportData = {
    exportedAt: new Date().toISOString(),
    notice:
      "This file contains all personal data Planned holds about you and your children. Photo links work while you are signed in.",
    account: {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      location: user.location,
      signInMethods: [
        ...(user.accounts.map((a) => a.provider)),
      ],
      subscriptionTier: user.subscriptionTier,
      subscriptionStatus: user.subscriptionStatus,
      termsAcceptedAt: user.termsAcceptedAt,
      termsVersion: user.termsVersion,
      aiConsentGivenAt: user.aiConsentAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    familyProfile: user.familyProfile && {
      ...user.familyProfile,
      goals: parseJson(user.familyProfile.goals),
    },
    children: user.children.map((c) => ({
      ...c,
      interests: parseJson(c.interests),
      lessons: c.lessons.map((l) => ({ ...l, generatedContent: parseJson(l.generatedContent) })),
      journalEntries: c.journalEntries.map((j) => ({
        ...j,
        tags: parseJson(j.tags),
        photoUrl: j.photoUrl ? `${base}/api/journal/${j.id}/photo` : null,
      })),
      externalActivities: c.externalActivities.map((a) => ({
        ...a,
        objectivesLinked: parseJson(a.objectivesLinked),
      })),
    })),
    assistantConversations: user.conversations,
  };

  const filename = `planned-data-export-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
