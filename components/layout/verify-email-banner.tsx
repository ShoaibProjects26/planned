"use client";

import { useState } from "react";
import { MailWarning, Loader2 } from "lucide-react";

export function VerifyEmailBanner({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function resend() {
    setState("sending");
    const res = await fetch("/api/auth/verify-email", { method: "POST" });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      setState("sent");
    } else {
      setState("error");
      setMsg(body.error ?? "Couldn't send the email.");
    }
  }

  return (
    <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <MailWarning className="w-4 h-4 shrink-0 hidden sm:block" />
      <p className="flex-1">
        Please confirm your email (<strong>{email}</strong>) so you can recover your account if you forget your password.
      </p>
      {state === "sent" ? (
        <span className="font-medium">Email sent — check your inbox.</span>
      ) : (
        <button
          onClick={resend}
          disabled={state === "sending"}
          className="inline-flex items-center gap-1.5 font-semibold underline underline-offset-2 disabled:opacity-60"
        >
          {state === "sending" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Resend email
        </button>
      )}
      {state === "error" && <span className="text-red-700">{msg}</span>}
    </div>
  );
}
