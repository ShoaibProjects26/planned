import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { LEGAL_VERSION } from "@/lib/legal";

const schema = z.object({
  acceptTerms: z.literal(true).optional(),
  confirmGuardian: z.literal(true).optional(),
  aiConsent: z.boolean().optional(),
});

/**
 * POST /api/user/consent
 *   { acceptTerms: true, confirmGuardian: true, aiConsent?: boolean }  — accept Terms (existing / Google users)
 *   { aiConsent: boolean }                                            — give or withdraw AI consent
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { acceptTerms, confirmGuardian, aiConsent } = parsed.data;

  if (acceptTerms && !confirmGuardian) {
    return NextResponse.json(
      { error: "Please confirm you are a parent or guardian aged 18 or over" },
      { status: 400 },
    );
  }

  const now = new Date();
  const data: Record<string, unknown> = {};
  if (acceptTerms) {
    data.termsAcceptedAt = now;
    data.termsVersion = LEGAL_VERSION;
  }
  if (aiConsent !== undefined) data.aiConsentAt = aiConsent ? now : null;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const user = await db.user.update({
    where: { id: session.user.id },
    data,
    select: { termsAcceptedAt: true, termsVersion: true, aiConsentAt: true },
  });

  return NextResponse.json({ ok: true, consent: user });
}
