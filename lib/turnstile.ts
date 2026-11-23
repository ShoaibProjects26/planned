/**
 * Cloudflare Turnstile bot protection (free, privacy-friendly CAPTCHA).
 *
 *   NEXT_PUBLIC_TURNSTILE_SITE_KEY — shown in the browser
 *   TURNSTILE_SECRET_KEY           — server-side verification
 *
 * When TURNSTILE_SECRET_KEY is not set, verification is skipped (so local
 * development works); IP rate limits still apply. Set both keys in production.
 */

export async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip && ip !== "unknown") body.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    console.error("[turnstile] verification failed:", err instanceof Error ? err.message : err);
    return false;
  }
}
