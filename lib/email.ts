/**
 * Transactional email via Resend's HTTP API (no SDK dependency).
 *
 *   RESEND_API_KEY  — from https://resend.com/api-keys
 *   EMAIL_FROM      — e.g. "Planned <noreply@getplanned.app>" (domain must be
 *                     verified in Resend)
 *
 * In development without RESEND_API_KEY the email is printed to the server
 * console instead, so password-reset / verification links can be tested.
 */

interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendEmail({ to, subject, text, html }: SendEmailParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Planned <noreply@getplanned.app>";

  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`\n[email:dev] To: ${to}\nSubject: ${subject}\n\n${text}\n`);
      return true;
    }
    console.error("[email] RESEND_API_KEY is not set — email not sent:", subject);
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, text, html }),
    });
    if (!res.ok) {
      console.error("[email] Resend error", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] send failed:", err instanceof Error ? err.message : err);
    return false;
  }
}

export function appUrl(): string {
  return (process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Simple branded layout with one call-to-action button. */
function layout(heading: string, body: string, ctaLabel: string, ctaUrl: string) {
  return `<!doctype html><html><body style="margin:0;background:#F7FAF7;font-family:Arial,Helvetica,sans-serif;color:#1f2d24">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;padding:32px" cellpadding="0" cellspacing="0">
<tr><td>
<h1 style="font-size:20px;margin:0 0 16px;color:#1e4d36">${escapeHtml(heading)}</h1>
<p style="font-size:15px;line-height:1.5;margin:0 0 24px">${body}</p>
<a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#2f7a52;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:bold">${escapeHtml(ctaLabel)}</a>
<p style="font-size:12px;color:#6b7a70;margin:24px 0 0">If the button doesn't work, paste this link into your browser:<br>${escapeHtml(ctaUrl)}</p>
<p style="font-size:12px;color:#6b7a70;margin:16px 0 0">If you didn't request this, you can safely ignore this email.</p>
</td></tr></table></td></tr></table></body></html>`;
}

export function passwordResetEmail(to: string, url: string) {
  return sendEmail({
    to,
    subject: "Reset your Planned password",
    text: `Someone (hopefully you) asked to reset your Planned password.\n\nReset it here (link valid for 1 hour):\n${url}\n\nIf you didn't request this, ignore this email — your password won't change.`,
    html: layout(
      "Reset your password",
      "Someone (hopefully you) asked to reset your Planned password. This link is valid for 1 hour.",
      "Choose a new password",
      url,
    ),
  });
}

export function verifyEmailEmail(to: string, url: string) {
  return sendEmail({
    to,
    subject: "Confirm your email for Planned",
    text: `Welcome to Planned! Please confirm your email address (link valid for 24 hours):\n${url}`,
    html: layout(
      "Confirm your email",
      "Welcome to Planned! Please confirm your email address so you can always recover your account. This link is valid for 24 hours.",
      "Confirm email",
      url,
    ),
  });
}
