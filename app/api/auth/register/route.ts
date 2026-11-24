import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { z } from "zod";
import { LEGAL_VERSION } from "@/lib/legal";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { verifyTurnstile } from "@/lib/turnstile";
import { createToken } from "@/lib/tokens";
import { appUrl, verifyEmailEmail } from "@/lib/email";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: z.string().trim().toLowerCase().email("Please enter a valid email").max(254),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(200)
    .regex(/[A-Za-z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  acceptTerms: z.literal(true, {
    error: "Please accept the Terms of Service and Privacy Policy",
  }),
  confirmGuardian: z.literal(true, {
    error: "Please confirm you are a parent or guardian aged 18 or over",
  }),
  aiConsent: z.boolean().optional().default(false),
  turnstileToken: z.string().max(2048).optional(),
});

export async function POST(req: Request) {
  const ip = clientIp(req);

  // Throttle account creation per IP (bots, spam sign-ups).
  const rl = await rateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.ok) return tooManyRequests(rl.retryAfterSeconds, "Too many sign-up attempts. Please try again later.");

  const body = await req.json().catch(() => null);
  const result = registerSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const { name, email, password, aiConsent, turnstileToken } = result.data;

  if (!(await verifyTurnstile(turnstileToken, ip, "register"))) {
    return NextResponse.json({ error: "Bot check failed. Please refresh and try again." }, { status: 400 });
  }

  const existing = await db.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();

  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash,
      termsAcceptedAt: now,
      termsVersion: LEGAL_VERSION,
      aiConsentAt: aiConsent ? now : null,
    },
    select: { id: true, name: true, email: true },
  });

  // Email verification — failure to send must not block sign-up.
  try {
    const token = await createToken("verify", email, 24 * 60 * 60 * 1000);
    await verifyEmailEmail(email, `${appUrl()}/api/auth/verify-email?token=${token}`);
  } catch (err) {
    console.error("[register] verification email failed:", err instanceof Error ? err.message : err);
  }

  return NextResponse.json({ user }, { status: 201 });
}
