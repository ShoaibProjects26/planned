/**
 * Stripe client setup
 *
 * TEST MODE (current):
 *   STRIPE_SECRET_KEY=sk_test_...
 *   STRIPE_PUBLISHABLE_KEY=pk_test_...
 *   STRIPE_WEBHOOK_SECRET=whsec_...   (from `stripe listen` CLI or dashboard)
 *
 * SWITCHING TO LIVE MODE:
 *   1. Replace sk_test_... → sk_live_... in .env
 *   2. Replace pk_test_... → pk_live_... in .env (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
 *   3. Replace whsec_... with the live webhook secret from the Stripe dashboard
 *   4. Update STRIPE_*_PRICE_ID vars with your live mode price IDs
 *   5. Remove the "Test mode" banner from the pricing page
 *
 * SETTING UP PRICE IDs:
 *   In your Stripe dashboard (test mode), create:
 *     Product "Planned Basic"  → monthly £7.99 price → STRIPE_BASIC_MONTHLY_PRICE_ID
 *                               → annual  £69    price → STRIPE_BASIC_ANNUAL_PRICE_ID
 *     Product "Planned Premium"→ monthly £14.99 price → STRIPE_PREMIUM_MONTHLY_PRICE_ID
 *                               → annual  £129   price → STRIPE_PREMIUM_ANNUAL_PRICE_ID
 */

import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error(
        "STRIPE_SECRET_KEY is not set. Add it to .env.local (test mode: sk_test_...; live mode: sk_live_...)."
      );
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    });
  }
  return _stripe;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string, unknown>)[prop as string];
  },
});

// ─── Plan definitions ─────────────────────────────────────────────────────────

export const PLANS = {
  FREE: {
    name: "Free",
    tier: "FREE",
    description: "Start your homeschool journey",
    monthlyPrice: 0,
    annualPrice: 0,
    annualMonthly: 0,           // per-month equivalent when billed annually
    stripePriceId: { monthly: "", annual: "" },
    color: "slate",
    limits: {
      children: 1,
      weeksOfLessons: 1,        // can only generate/access 1 week at a time
      pdfExport: false,
      bloomGarden: false,       // basic stars only
      interactiveWorksheets: false,
      journalPdf: false,
      locationDayOuts: false,
    },
    features: [
      "1 child",
      "1 week of lessons at a time",
      "Printable worksheets",
      "Basic progress bars",
      "Basic Bloom stars",
    ],
  },
  BASIC: {
    name: "Basic",
    tier: "BASIC",
    description: "Great for one or two children",
    monthlyPrice: 799,          // pence
    annualPrice: 6900,          // pence (£69 — saves ~£27/yr vs monthly)
    annualMonthly: 575,         // £5.75/mo equivalent
    stripePriceId: {
      monthly: process.env.STRIPE_BASIC_MONTHLY_PRICE_ID ?? "",
      annual:  process.env.STRIPE_BASIC_ANNUAL_PRICE_ID  ?? "",
    },
    color: "brand-green",
    limits: {
      children: 2,
      weeksOfLessons: 4,        // up to 1 month ahead
      pdfExport: false,
      bloomGarden: true,
      interactiveWorksheets: false,
      journalPdf: false,
      locationDayOuts: false,
    },
    features: [
      "2 children",
      "1 month of lessons at a time",
      "Full Bloom reward garden",
      "Basic reward goals",
      "Journal (no PDF export)",
    ],
  },
  PREMIUM: {
    name: "Premium",
    tier: "PREMIUM",
    description: "Everything, for the whole family",
    monthlyPrice: 1499,         // pence
    annualPrice: 12900,         // pence (£129 — saves ~£51/yr vs monthly)
    annualMonthly: 1075,        // £10.75/mo equivalent
    stripePriceId: {
      monthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID ?? "",
      annual:  process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID  ?? "",
    },
    color: "purple",
    limits: {
      children: -1,             // unlimited
      weeksOfLessons: -1,       // full year plan
      pdfExport: true,
      bloomGarden: true,
      interactiveWorksheets: true,
      journalPdf: true,
      locationDayOuts: true,
    },
    features: [
      "Unlimited children",
      "Full year lesson plan",
      "Interactive worksheets",
      "Full Bloom garden",
      "Journal with PDF export",
      "Location-personalised day outs",
    ],
  },
} as const;

export type Tier = keyof typeof PLANS;
export type BillingInterval = "monthly" | "annual";
