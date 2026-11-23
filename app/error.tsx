"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error]", error.digest ?? "", error.message);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-sm w-full text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
        <h1 className="font-display text-xl font-bold text-brand-green-deep">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          Sorry, that didn&apos;t work. Your data is safe. Please try again, and if it keeps happening let us know.
          {error.digest && (
            <span className="block mt-2 text-xs">Reference: {error.digest}</span>
          )}
        </p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={reset}
            className="h-10 px-5 rounded-xl bg-brand-green hover:bg-brand-green-deep text-white text-sm font-semibold"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="h-10 px-5 inline-flex items-center rounded-xl border border-border text-sm font-medium text-brand-green-deep"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
