/**
 * Database-backed sliding-window rate limiter.
 *
 * The previous version kept hits in process memory, which on Vercel meant
 * every serverless instance had its own counter — an attacker could get
 * N × limit requests through by hitting cold instances. Hits now live in
 * Postgres (`RateLimitHit`), so a limit is global across all instances.
 *
 * Cost: one COUNT + one INSERT per call, both on an indexed column. That is
 * negligible next to the AI call these limits protect.
 */

import { db } from "@/lib/db";

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

const PRUNE_OLDER_THAN_MS = 2 * 24 * 60 * 60 * 1000;

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  const cutoff = new Date(now - windowMs);

  if (limit <= 0) {
    return { ok: false, remaining: 0, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }

  const count = await db.rateLimitHit.count({
    where: { key, createdAt: { gte: cutoff } },
  });

  if (count >= limit) {
    const oldest = await db.rateLimitHit.findFirst({
      where: { key, createdAt: { gte: cutoff } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    const resetAt = (oldest?.createdAt.getTime() ?? now) + windowMs;
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
    };
  }

  await db.rateLimitHit.create({ data: { key } });

  // Opportunistic cleanup (~1% of calls) so the table doesn't grow forever.
  if (Math.random() < 0.01) {
    db.rateLimitHit
      .deleteMany({ where: { createdAt: { lt: new Date(now - PRUNE_OLDER_THAN_MS) } } })
      .catch(() => {});
  }

  return { ok: true, remaining: limit - count - 1, retryAfterSeconds: 0 };
}

/** Best-effort client IP for anonymous endpoints (register, password reset). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function tooManyRequests(retryAfterSeconds: number, message?: string) {
  return Response.json(
    { error: message ?? `Too many requests. Try again in ${retryAfterSeconds}s.` },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}
