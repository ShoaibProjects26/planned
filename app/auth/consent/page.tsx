"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarCheck, Loader2 } from "lucide-react";

/**
 * Shown to signed-in users who haven't accepted the current Terms yet
 * (accounts created before consent existed, or via Google sign-in).
 */
export default function ConsentPage() {
  const router = useRouter();
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [confirmGuardian, setConfirmGuardian] = useState(false);
  const [aiConsent, setAiConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!acceptTerms || !confirmGuardian) {
      setError("Please tick both required boxes to continue.");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/user/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acceptTerms: true, confirmGuardian: true, aiConsent }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong. Please try again.");
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-brand-off-white flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl planned-gradient flex items-center justify-center shadow-md mb-4">
            <CalendarCheck className="w-7 h-7 text-white" strokeWidth={1.75} />
          </div>
          <h1 className="font-display text-2xl font-bold text-brand-green-deep">Before you continue</h1>
          <p className="text-sm text-muted-foreground mt-1">
            We&apos;ve published our Terms and Privacy Policy. Please review and accept them.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-border/50 shadow-sm p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
          )}

          <label className="flex items-start gap-3 text-sm text-brand-green-deep cursor-pointer">
            <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="w-4 h-4 mt-0.5 accent-brand-green shrink-0" />
            <span>
              I agree to the <Link href="/terms" target="_blank" className="underline underline-offset-2">Terms of Service</Link> and
              have read the <Link href="/privacy" target="_blank" className="underline underline-offset-2">Privacy Policy</Link>.{" "}
              <span className="text-red-600">*</span>
            </span>
          </label>

          <label className="flex items-start gap-3 text-sm text-brand-green-deep cursor-pointer">
            <input type="checkbox" checked={confirmGuardian} onChange={(e) => setConfirmGuardian(e.target.checked)} className="w-4 h-4 mt-0.5 accent-brand-green shrink-0" />
            <span>
              I am 18 or over and the parent or legal guardian of the children on this account.{" "}
              <span className="text-red-600">*</span>
            </span>
          </label>

          <label className="flex items-start gap-3 text-sm text-brand-green-deep cursor-pointer">
            <input type="checkbox" checked={aiConsent} onChange={(e) => setAiConsent(e.target.checked)} className="w-4 h-4 mt-0.5 accent-brand-green shrink-0" />
            <span>
              I consent to my children&apos;s age, year group, learning style, interests and our faith preference
              being processed by our AI provider (Google Gemini) to generate lessons. Names are replaced with
              placeholders before sending.{" "}
              <span className="text-muted-foreground">Optional — AI lesson planning won&apos;t work without it.</span>
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-brand-green hover:bg-brand-green-deep disabled:opacity-60 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
