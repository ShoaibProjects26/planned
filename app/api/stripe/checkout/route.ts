import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe, PLANS } from "@/lib/stripe";
import type { BillingInterval, Tier } from "@/lib/stripe";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tier, interval } = (await req.json()) as {
    tier: Tier;
    interval: BillingInterval;
  };

  if (!tier || !interval) {
    return NextResponse.json({ error: "tier and interval are required" }, { status: 400 });
  }

  const plan = PLANS[tier];
  if (!plan || tier === "FREE") {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const priceId = plan.stripePriceId[interval];
  if (!priceId) {
    return NextResponse.json(
      { error: `Price ID for ${tier} ${interval} is not configured. Set STRIPE_${tier}_${interval.toUpperCase()}_PRICE_ID in .env` },
      { status: 500 }
    );
  }

  // Find or create Stripe customer
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, stripeCustomerId: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: user.name ?? undefined,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await db.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard/settings?upgraded=1`,
    cancel_url: `${appUrl}/pricing`,
    client_reference_id: user.id,
    subscription_data: {
      metadata: { userId: user.id, tier },
    },
    metadata: { userId: user.id, tier },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
