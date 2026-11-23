"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, KeyRound, Loader2, CheckCircle2 } from "lucide-react";

function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong. Please try again.");
      return;
    }
    setDone(true);
  }

  if (!token) {
    return (
      <p className="text-sm text-center text-brand-green-deep">
        This link is missing its reset code.{" "}
        <Link href="/auth/forgot-password" className="underline">Request a new link</Link>.
      </p>
    );
  }

  if (done) {
    return (
      <div className="text-center space-y-3">
        <CheckCircle2 className="w-10 h-10 text-brand-green mx-auto" />
        <p className="text-sm text-brand-green-deep">Your password has been changed.</p>
        <Link
          href="/auth/signin"
          className="inline-flex h-11 items-center justify-center px-6 bg-brand-green hover:bg-brand-green-deep text-white font-semibold rounded-xl"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const inputClass =
    "w-full h-11 px-4 pr-11 rounded-xl border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 placeholder:text-muted-foreground";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}{" "}
          {error.includes("expired") && (
            <Link href="/auth/forgot-password" className="underline font-medium">Request a new link</Link>
          )}
        </div>
      )}
      <div>
        <label className="text-sm font-medium text-brand-green-deep block mb-1.5">New password</label>
        <div className="relative">
          <input
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters, with a number"
            required
            minLength={8}
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-brand-green-deep block mb-1.5">Confirm new password</label>
        <input
          type={show ? "text" : "password"}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={8}
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full h-12 bg-brand-green hover:bg-brand-green-deep disabled:opacity-60 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Save new password
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-brand-off-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl planned-gradient flex items-center justify-center shadow-md mb-4">
            <KeyRound className="w-7 h-7 text-white" strokeWidth={1.75} />
          </div>
          <h1 className="font-display text-2xl font-bold text-brand-green-deep">Choose a new password</h1>
        </div>
        <div className="bg-white rounded-3xl border border-border/50 shadow-sm p-6">
          <Suspense fallback={<Loader2 className="w-5 h-5 animate-spin mx-auto text-brand-green" />}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
