"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Check, Zap, Leaf, Sparkles, ArrowLeft, TestTube2, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Comparison rows (for the "what's different" table) ──────────────────────
// Free / Basic / Premium values per row. Use a string for limit-style values
// ("1", "2", "Unlimited"), and `true`/`false` for binary features.

type CellValue = string | boolean;

const COMPARISON: { group: string; rows: { label: string; values: [CellValue, CellValue, CellValue] }[] }[] = [
  {
    group: "Children & lessons",
    rows: [
      { label: "Child profiles",            values: ["1",                "2",                "Up to 5"] },
      { label: "Lesson plan horizon",       values: ["1 week at a time", "Up to 1 month",    "Up to 3 months"] },
      { label: "AI-generated lesson plans", values: [true,               true,               true] },
      { label: "Printable worksheets",      values: [true,               true,               true] },
    ],
  },
  {
    group: "Progress & rewards",
    rows: [
      { label: "Basic progress bars",       values: [true,  true,  true] },
      { label: "Basic Bloom stars",         values: [true,  true,  true] },
      { label: "Bloom reward garden",       values: [false, true,  true] },
    ],
  },
  {
    group: "Journal",
    rows: [
      { label: "Journal entries",           values: [false, true,  true] },
      { label: "PDF journal keepsake",      values: [false, false, true] },
    ],
  },
  {
    group: "Local content",
    rows: [
      { label: "Location-based day outs",   values: [false, false, true] },
    ],
  },
];

// ─── Plan data ────────────────────────────────────────────────────────────────

// Each tier's `features` array lists only what's UNIQUE to that tier.
// The previous design listed every feature on every card with checks /
// strikethroughs, which the client called out as confusing — Premium
// in particular appeared to contradict itself (it showed both "1 week
// of lessons" and "full year lesson plan").
//
// `inheritsFrom` is rendered as a "Everything in <Lower>, plus:" header
// so users still understand the strict superset relationship without
// every line being duplicated three times.

const PLANS = [
  {
    tier: "FREE",
    name: "Free",
    icon: <Leaf className="w-5 h-5" />,
    color: "slate",
    monthlyPrice: "£0",
    annualPrice: "£0",
    annualPerMonth: "£0",
    description: "Start your homeschool journey",
    cta: "Get started",
    ctaHref: "/auth/signin",
    popular: false,
    inheritsFrom: null,
    features: [
      "1 child profile",
      "1 week of lessons at a time",
      "AI-generated lesson plans",
      "Printable worksheets",
      "Basic progress bars",
      "Basic Bloom stars",
    ],
  },
  {
    tier: "BASIC",
    name: "Basic",
    icon: <Zap className="w-5 h-5" />,
    color: "brand-green",
    monthlyPrice: "£7.99",
    annualPrice: "£69",
    annualPerMonth: "£5.75",
    annualSaving: "Save £27",
    description: "Perfect for one or two children",
    cta: "Start Basic",
    ctaHref: null,             // handled by checkout
    popular: true,
    inheritsFrom: "Free",
    features: [
      "Up to 2 children",
      "Plan up to 1 month of lessons ahead",
      "Full Bloom reward garden + badges",
      "Journal entries with photos",
    ],
  },
  {
    tier: "PREMIUM",
    name: "Premium",
    icon: <Sparkles className="w-5 h-5" />,
    color: "purple",
    monthlyPrice: "£14.99",
    annualPrice: "£129",
    annualPerMonth: "£10.75",
    annualSaving: "Save £51",
    description: "Everything, for the whole family",
    cta: "Start Premium",
    ctaHref: null,
    popular: false,
    inheritsFrom: "Basic",
    features: [
      "Up to 5 children",
      "Plan up to 3 months of lessons ahead",
      "Location-personalised day-out ideas",
      "PDF journal keepsake export",
      "Interactive worksheets",
    ],
  },
];

type Interval = "monthly" | "annual";

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const { data: session } = useSession();
  const [interval, setInterval] = useState<Interval>("annual");
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function startCheckout(tier: string) {
    if (!session) {
      window.location.href = "/auth/signin?callbackUrl=/pricing";
      return;
    }
    setCheckoutLoading(tier);
    setError("");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, interval }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Could not start checkout.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setCheckoutLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#F7FAF7]">
      {/* Test mode banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-center gap-2">
        <TestTube2 className="w-4 h-4 text-amber-600 shrink-0" />
        <p className="text-xs text-amber-700">
          <strong>Test mode</strong> — use card number{" "}
          <code className="font-mono bg-amber-100 px-1 rounded">4242 4242 4242 4242</code>,
          any future date, any CVC.
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-12 space-y-10">
        {/* Back link for logged-in users */}
        {session && (
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-brand-green transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to dashboard
          </Link>
        )}

        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="font-display text-4xl font-bold text-brand-green-deep">
            Simple, honest pricing
          </h1>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto">
            Start free, upgrade when you&apos;re ready. No hidden fees, cancel any time.
          </p>

          {/* Monthly / Annual toggle */}
          <div className="inline-flex bg-white rounded-xl border border-[hsl(var(--border))] p-1 gap-1 mt-4">
            <button
              onClick={() => setInterval("monthly")}
              className={cn(
                "px-5 py-2 rounded-lg text-sm font-medium transition-all",
                interval === "monthly"
                  ? "bg-brand-green text-white shadow-sm"
                  : "text-muted-foreground hover:text-brand-green-deep"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval("annual")}
              className={cn(
                "px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                interval === "annual"
                  ? "bg-brand-green text-white shadow-sm"
                  : "text-muted-foreground hover:text-brand-green-deep"
              )}
            >
              Annual
              <span
                className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                  interval === "annual"
                    ? "bg-white/20 text-white"
                    : "bg-brand-mint text-brand-green-deep"
                )}
              >
                2 months free
              </span>
            </button>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map((plan) => {
            const isFree = plan.tier === "FREE";
            const isPopular = plan.popular;
            const price = interval === "annual" ? plan.annualPerMonth : plan.monthlyPrice;
            const billingNote =
              !isFree && interval === "annual"
                ? `Billed ${plan.annualPrice}/year`
                : !isFree
                ? "Billed monthly"
                : null;

            return (
              <div
                key={plan.tier}
                className={cn(
                  "relative bg-white rounded-3xl border-2 p-6 flex flex-col",
                  isPopular
                    ? "border-brand-green shadow-lg shadow-brand-green/10"
                    : "border-[hsl(var(--border))]"
                )}
              >
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-brand-green text-white text-xs font-bold px-4 py-1 rounded-full shadow-sm whitespace-nowrap">
                      Most popular
                    </span>
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-5">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center mb-3",
                      plan.tier === "FREE"    && "bg-slate-100 text-slate-600",
                      plan.tier === "BASIC"   && "bg-brand-mint text-brand-green",
                      plan.tier === "PREMIUM" && "bg-purple-100 text-purple-600"
                    )}
                  >
                    {plan.icon}
                  </div>
                  <h2 className="font-display text-xl font-bold text-brand-green-deep">
                    {plan.name}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {plan.description}
                  </p>
                </div>

                {/* Price */}
                <div className="mb-5">
                  <div className="flex items-end gap-1">
                    <span className="font-display text-4xl font-bold text-brand-green-deep">
                      {isFree ? "Free" : price}
                    </span>
                    {!isFree && (
                      <span className="text-muted-foreground text-sm mb-1.5">/mo</span>
                    )}
                  </div>
                  {billingNote && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {billingNote}
                      {interval === "annual" && "annualSaving" in plan && (
                        <span className="ml-1.5 text-brand-green font-semibold">
                          — {plan.annualSaving}
                        </span>
                      )}
                    </p>
                  )}
                </div>

                {/* CTA */}
                {isFree ? (
                  <Link
                    href={session ? "/dashboard" : "/auth/signin"}
                    className="w-full py-2.5 rounded-xl border-2 border-[hsl(var(--border))] text-sm font-semibold text-muted-foreground hover:border-brand-green/30 hover:text-brand-green-deep text-center transition-all mb-5"
                  >
                    {session ? "Current plan" : "Get started free"}
                  </Link>
                ) : (
                  <button
                    onClick={() => startCheckout(plan.tier)}
                    disabled={checkoutLoading === plan.tier}
                    className={cn(
                      "w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all mb-5 disabled:opacity-60",
                      plan.tier === "BASIC"   && "bg-brand-green hover:bg-brand-green-deep",
                      plan.tier === "PREMIUM" && "bg-purple-600 hover:bg-purple-700"
                    )}
                  >
                    {checkoutLoading === plan.tier ? "Loading…" : plan.cta}
                  </button>
                )}

                {/* Features — only what's unique to this tier. The
                    "Everything in <lower>, plus:" header keeps the
                    superset relationship clear without duplicating
                    every line from the lower tier. */}
                <div className="space-y-2.5 flex-1">
                  {plan.inheritsFrom && (
                    <p className="text-xs font-semibold text-brand-green-deep/80 pb-1">
                      Everything in {plan.inheritsFrom}, plus:
                    </p>
                  )}
                  <ul className="space-y-2.5">
                    {plan.features.map((text) => (
                      <li key={text} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 mt-0.5 shrink-0 text-brand-green" />
                        <span className="text-sm text-brand-green-deep">{text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <p className="text-center text-sm text-destructive">{error}</p>
        )}

        {/* Comparison table — makes plan differences obvious at a glance */}
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold text-brand-green-deep">
              Compare plans
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              See exactly what changes as you upgrade.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-[hsl(var(--border))] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="text-left font-semibold px-5 py-3 w-2/5">Feature</th>
                    <th className="text-center font-semibold px-3 py-3">Free</th>
                    <th className="text-center font-semibold px-3 py-3 bg-brand-mint/40 text-brand-green-deep">Basic</th>
                    <th className="text-center font-semibold px-3 py-3">Premium</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((group) => (
                    <Fragment key={group.group}>
                      <tr className="border-t border-[hsl(var(--border))]">
                        <td colSpan={4} className="px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-brand-green bg-brand-mint/20">
                          {group.group}
                        </td>
                      </tr>
                      {group.rows.map((row) => (
                        <tr key={row.label} className="border-t border-[hsl(var(--border))] last:border-b-0">
                          <td className="px-5 py-3 text-brand-green-deep">{row.label}</td>
                          {row.values.map((val, i) => (
                            <td
                              key={i}
                              className={cn(
                                "text-center px-3 py-3",
                                i === 1 && "bg-brand-mint/20"
                              )}
                            >
                              {val === true ? (
                                <Check className="w-4 h-4 text-brand-green inline-block" />
                              ) : val === false ? (
                                <Minus className="w-4 h-4 text-muted-foreground/40 inline-block" />
                              ) : (
                                <span className="text-sm font-medium text-brand-green-deep">{val}</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FAQ-style reassurance */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          {[
            { icon: "🔒", title: "Secure payments", body: "Powered by Stripe — your card details never touch our servers." },
            { icon: "🔄", title: "Cancel any time", body: "No lock-in. Cancel from your account settings and you won't be charged again." },
            { icon: "💬", title: "Questions?", body: "Email hello@planned.app and we'll get back to you within one working day." },
          ].map((item) => (
            <div key={item.title} className="bg-white rounded-2xl border border-[hsl(var(--border))] px-5 py-4">
              <p className="text-2xl mb-2">{item.icon}</p>
              <p className="font-semibold text-sm text-brand-green-deep">{item.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
