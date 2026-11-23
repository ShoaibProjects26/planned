import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { consumeToken, createToken } from "@/lib/tokens";
import { appUrl, verifyEmailEmail } from "@/lib/email";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/** GET /api/auth/verify-email?token=…  — link clicked from the email. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const email = await consumeToken("verify", token);

  if (!email) {
    return NextResponse.redirect(`${appUrl()}/auth/verify-email?status=invalid`);
  }

  await db.user.updateMany({
    where: { email: { equals: email, mode: "insensitive" }, emailVerified: null },
    data: { emailVerified: new Date() },
  });

  return NextResponse.redirect(`${appUrl()}/auth/verify-email?status=ok`);
}

/** POST /api/auth/verify-email  — resend the verification email (signed in). */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await rateLimit(`verify-resend:${session.user.id}`, 3, 60 * 60 * 1000);
  if (!rl.ok) return tooManyRequests(rl.retryAfterSeconds, "Please wait before requesting another email.");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, emailVerified: true },
  });
  if (!user?.email) return NextResponse.json({ error: "No email on account" }, { status: 400 });
  if (user.emailVerified) return NextResponse.json({ ok: true, alreadyVerified: true });

  const token = await createToken("verify", user.email, 24 * 60 * 60 * 1000);
  const sent = await verifyEmailEmail(user.email, `${appUrl()}/api/auth/verify-email?token=${token}`);
  if (!sent) {
    return NextResponse.json({ error: "Couldn't send the email right now. Please try later." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
