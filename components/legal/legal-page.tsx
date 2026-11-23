import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-brand-off-white">
      <div className="max-w-3xl mx-auto px-5 py-10 sm:py-14">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-brand-green mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Planned
        </Link>

        <div className="mb-8 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Draft — not yet reviewed by a solicitor.</strong> This document describes how the app
          currently works. It must be reviewed by a qualified UK data-protection lawyer, and the bracketed
          placeholders completed, before Planned is opened to the public.
        </div>

        <h1 className="font-display text-3xl sm:text-4xl font-bold text-brand-green-deep">{title}</h1>
        <p className="text-sm text-muted-foreground mt-2">Last updated: {updated}</p>

        <div
          className="mt-8 bg-white rounded-3xl border border-border/50 p-6 sm:p-10 text-[15px] leading-relaxed text-brand-green-deep
            [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3 [&_h2:first-child]:mt-0
            [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2
            [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3 [&_li]:mb-1.5
            [&_a]:underline [&_a]:underline-offset-2 [&_table]:w-full [&_table]:text-sm [&_table]:mb-4
            [&_th]:text-left [&_th]:py-2 [&_th]:pr-4 [&_th]:border-b [&_td]:py-2 [&_td]:pr-4 [&_td]:border-b [&_td]:align-top"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
