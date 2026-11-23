import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";

export const metadata = { title: "Email confirmation" };

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const ok = searchParams.status === "ok";

  return (
    <div className="min-h-screen bg-brand-off-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-border/50 shadow-sm p-8 text-center space-y-4">
        {ok ? (
          <CheckCircle2 className="w-12 h-12 text-brand-green mx-auto" />
        ) : (
          <XCircle className="w-12 h-12 text-red-500 mx-auto" />
        )}
        <h1 className="font-display text-xl font-bold text-brand-green-deep">
          {ok ? "Email confirmed" : "Link invalid or expired"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {ok
            ? "Thanks — your email address is confirmed."
            : "This confirmation link has already been used or has expired. Sign in and use “Resend email” on your dashboard to get a new one."}
        </p>
        <Link
          href="/dashboard"
          className="inline-flex h-11 items-center justify-center px-6 bg-brand-green hover:bg-brand-green-deep text-white font-semibold rounded-xl"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
