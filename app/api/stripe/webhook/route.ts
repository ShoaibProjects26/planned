/**
 * Stripe webhook handler
 *
 * Register this endpoint in your Stripe dashboard:
 *   Endpoint URL: https://yourdomain.com/api/stripe/webhook
 *   Events to listen for:
 *     - checkout.session.completed
 *     - customer.subscription.updated
 *     - customer.subscription.deleted
 *
 * Local dev — use the Stripe CLI:
 *   stripe listen --forward-to localhost:3000/api/stripe/webhook
 *   Copy the printed webhook secret → STRIPE_WEBHOOK_SECRET in .env
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import type Stripe from "stripe";

// ── Helpers ───────────────────────────────────────────────────────────────────

function tierFromPriceId(priceId: string): string {
  const basic   = [process.env.STRIPE_BASIC_MONTHLY_PRICE_ID,   process.env.STRIPE_BASIC_ANNUAL_PRICE_ID];
  const premium = [process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID, process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID];
  if (basic.includes(priceId))   return "BASIC";
  if (premium.includes(priceId)) return "PREMIUM";
  return "FREE";
}

function stripeStatusToInternal(status: Stripe.Subscription.Status): string {
  const map: Record<Stripe.Subscription.Status, string> = {
    active:             "ACTIVE",
    trialing:           "TRIALING",
    past_due:           "PAST_DUE",
    canceled:           "CANCELED",
    unpaid:             "CANCELED",
    incomplete:         "INACTIVE",
    incomplete_expired: "INACTIVE",
    paused:             "INACTIVE",
  };
  return map[status] ?? "INACTIVE";
}

async function resolveUserId(
  metadata: Stripe.Metadata | null,
  customerId: string
): Promise<string | null> {
  if (metadata?.userId) return metadata.userId;
  const user = await db.user.findUnique({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  return user?.id ?? null;
}

async function upsertSubscription(sub: Stripe.Subscription) {
  const userId = await resolveUserId(sub.metadata, sub.customer as string);
  if (!userId) {
    console.error("Webhook: cannot resolve userId for subscription", sub.id);
    return;
  }
  const priceId = sub.items.data[0]?.price.id ?? "";
  await db.user.update({
    where: { id: userId },
    data: {
      subscriptionTier:     tierFromPriceId(priceId),
      subscriptionStatus:   stripeStatusToInternal(sub.status),
      stripeSubscriptionId: sub.id,
      stripeCustomerId:     sub.customer as string,
    },
  });
}

async function cancelSubscription(sub: Stripe.Subscription) {
  const userId = await resolveUserId(sub.metadata, sub.customer as string);
  if (!userId) return;
  await db.user.update({
    where: { id: userId },
    data: {
      subscriptionTier:   "FREE",
      subscriptionStatus: "CANCELED",
    },
  });
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const body      = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const cs = event.data.object as Stripe.Checkout.Session;
        if (cs.mode === "subscription" && cs.subscription) {
          const sub = await stripe.subscriptions.retrieve(cs.subscription as string);
          // Carry metadata from checkout session to subscription
          if (cs.metadata?.userId && !sub.metadata?.userId) {
            await stripe.subscriptions.update(sub.id, {
              metadata: { userId: cs.metadata.userId, tier: cs.metadata.tier ?? "" },
            });
            sub.metadata = { ...sub.metadata, ...cs.metadata };
          }
          await upsertSubscription(sub);
        }
        break;
      }
      case "customer.subscription.updated":
        await upsertSubscription(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await cancelSubscription(event.data.object as Stripe.Subscription);
        break;
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
