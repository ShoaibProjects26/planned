"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { KeyRound, Loader2, MailCheck } from "lucide-react";
import { Turnstile, turnstileEnabled } from "@/components/layout/turnstile";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const onToken = useCallback((t: string) => setTurnstileToken(t), []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (turnstileEnabled && !turnstileToken) {
      setError("Please complete the security check.");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, turnstileToken: turnstileToken || undefined }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong. Please try again.");
      return;
    }
    setSent(true);
  }

  return (
    <div className="min-h-screen bg-brand-off-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl planned-gradient flex items-center justify-center shadow-md mb-4">
            <KeyRound className="w-7 h-7 text-white" strokeWidth={1.75} />
          </div>
          <h1 className="font-display text-2xl font-bold text-brand-green-deep">Forgot your password?</h1>
          <p className="text-sm text-muted-foreground mt-1">We&apos;ll email you a link to choose a new one.</p>
        </div>

        <div className="bg-white rounded-3xl border border-border/50 shadow-sm p-6 space-y-4">
          {sent ? (
            <div className="text-center space-y-3">
              <MailCheck className="w-10 h-10 text-brand-green mx-auto" />
              <p className="text-sm text-brand-green-deep">
                If an account exists for <strong>{email}</strong>, a reset link is on its way. It&apos;s valid for 1 hour.
              </p>
              <p className="text-xs text-muted-foreground">Don&apos;t forget to check your spam folder.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
              )}
              <div>
                <label className="text-sm font-medium text-brand-green-deep block mb-1.5">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full h-11 px-4 rounded-xl border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 placeholder:text-muted-foreground"
                />
              </div>
              <Turnstile onToken={onToken} />
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-brand-green hover:bg-brand-green-deep disabled:opacity-60 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Send reset link
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/auth/signin" className="text-brand-green font-semibold hover:text-brand-green-deep">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
