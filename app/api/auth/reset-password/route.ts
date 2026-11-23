import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { consumeToken } from "@/lib/tokens";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";

const schema = z.object({
  token: z.string().min(10).max(200),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(200)
    .regex(/[A-Za-z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

/** POST /api/auth/reset-password  { token, password } */
export async function POST(req: Request) {
  const rl = await rateLimit(`reset:ip:${clientIp(req)}`, 20, 60 * 60 * 1000);
  if (!rl.ok) return tooManyRequests(rl.retryAfterSeconds);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const email = await consumeToken("reset", parsed.data.token);
  if (!email) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired. Please request a new one." },
      { status: 400 },
    );
  }

  const user = await db.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, emailVerified: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Account not found." }, { status: 400 });
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
      // Receiving the reset email proves the parent owns the address.
      emailVerified: user.emailVerified ?? new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
