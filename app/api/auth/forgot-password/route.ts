import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { verifyTurnstile } from "@/lib/turnstile";
import { createToken } from "@/lib/tokens";
import { appUrl, passwordResetEmail } from "@/lib/email";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  turnstileToken: z.string().max(2048).optional(),
});

/**
 * POST /api/auth/forgot-password  { email }
 *
 * Always answers with the same message whether or not the account exists,
 * so this can't be used to discover which emails are registered.
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  const ipLimit = await rateLimit(`forgot:ip:${ip}`, 10, 60 * 60 * 1000);
  if (!ipLimit.ok) return tooManyRequests(ipLimit.retryAfterSeconds, "Too many requests. Please try again later.");

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  const { email, turnstileToken } = parsed.data;

  if (!(await verifyTurnstile(turnstileToken, ip, "forgot_password"))) {
    return NextResponse.json({ error: "Bot check failed. Please refresh and try again." }, { status: 400 });
  }

  const ok = NextResponse.json({
    ok: true,
    message: "If an account exists for that email, we've sent a link to reset the password.",
  });

  // Max 3 reset emails per address per hour (stops inbox flooding).
  const emailLimit = await rateLimit(`forgot:email:${email}`, 3, 60 * 60 * 1000);
  if (!emailLimit.ok) return ok;

  const user = await db.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { email: true, passwordHash: true },
  });

  // Google-only accounts have no password to reset.
  if (user?.email && user.passwordHash) {
    const token = await createToken("reset", user.email, 60 * 60 * 1000);
    await passwordResetEmail(user.email, `${appUrl()}/auth/reset-password?token=${token}`);
  }

  return ok;
}
