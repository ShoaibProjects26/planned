/**
 * Simple in-memory per-key rate limiter.
 *
 * Keeps a sliding window of recent hits per key (typically a userId) and
 * rejects when the count in the window exceeds `limit`.
 *
 * NOTE: this is in-process memory, so on a multi-instance deployment
 * (Vercel serverless, multiple Node workers) the limit is enforced per
 * instance, not globally. For strict global limits move to Upstash Redis
 * (or similar) — the API surface here is intentionally small so swapping
 * implementations is trivial.
 */

type Window = { hits: number[] };

const store = new Map<string, Window>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;

  const entry = store.get(key) ?? { hits: [] };
  // Drop expired hits
  entry.hits = entry.hits.filter((t) => t > cutoff);

  if (entry.hits.length >= limit) {
    const oldest = entry.hits[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    store.set(key, entry);
    return { ok: false, remaining: 0, retryAfterSeconds };
  }

  entry.hits.push(now);
  store.set(key, entry);
  return { ok: true, remaining: limit - entry.hits.length, retryAfterSeconds: 0 };
}
