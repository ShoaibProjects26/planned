/**
 * Cloudflare Turnstile bot protection (free, privacy-friendly CAPTCHA).
 *
 *   NEXT_PUBLIC_TURNSTILE_SITE_KEY — shown in the browser
 *   TURNSTILE_SECRET_KEY           — server-side verification
 *   TURNSTILE_HOSTNAMES            — comma-separated hostnames the widget may be
 *                                    solved on (e.g. "getplanned.app"). Falls back
 *                                    to the host(s) in NEXT_PUBLIC_APP_URL.
 *
 * When TURNSTILE_SECRET_KEY is not set, verification is skipped (so local
 * development works); IP rate limits still apply. Set both keys in production.
 */

/** One stable action per protected form — must match the widget's `action`. */
export type TurnstileAction = "register" | "forgot_password";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const MAX_TOKEN_LENGTH = 2048;
const TIMEOUT_MS = 10_000;

type SiteverifyResponse = {
  success?: boolean;
  action?: string;
  hostname?: string;
  "error-codes"?: string[];
};

function allowedHostnames(): string[] {
  const raw = process.env.TURNSTILE_HOSTNAMES || process.env.NEXT_PUBLIC_APP_URL || "";
  return raw
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean)
    .map((h) => {
      try {
        return new URL(h.includes("://") ? h : `https://${h}`).hostname.toLowerCase();
      } catch {
        return "";
      }
    })
    .filter(Boolean);
}

export async function verifyTurnstile(
  token: string | undefined,
  ip: string,
  expectedAction: TurnstileAction,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token || token.length > MAX_TOKEN_LENGTH) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip && ip !== "unknown") body.set("remoteip", ip);
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const data = (await res.json()) as SiteverifyResponse;

    if (data.success !== true) {
      console.warn("[turnstile] rejected:", data["error-codes"]?.join(",") || "unknown");
      return false;
    }
    if (data.action !== expectedAction) {
      console.warn(`[turnstile] action mismatch: got "${data.action}", expected "${expectedAction}"`);
      return false;
    }
    const hosts = allowedHostnames();
    if (hosts.length > 0 && !hosts.includes((data.hostname ?? "").toLowerCase())) {
      console.warn(`[turnstile] hostname not allowed: "${data.hostname}"`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[turnstile] verification failed:", err instanceof Error ? err.message : err);
    return false;
  }
}
