import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, stripeCustomerId: true, stripeSubscriptionId: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Cancel active Stripe subscription if any
  if (user.stripeSubscriptionId) {
    try {
      await stripe.subscriptions.cancel(user.stripeSubscriptionId);
    } catch {
      // Non-fatal — proceed with deletion
    }
  }

  // Cascade-delete handled by Prisma onDelete: Cascade on all child relations
  await db.user.delete({ where: { id: user.id } });

  return NextResponse.json({ ok: true });
}
