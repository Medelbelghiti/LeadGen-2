import { NextResponse } from "next/server";
import { withErrorHandling, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireStripe } from "@/lib/stripe-client";

export const POST = withErrorHandling(async () => {
  const user = await requireUser();
  const sub = await db.subscription.findFirst({
    where: { userId: user.id, stripeSubscriptionId: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  if (!sub?.stripeSubscriptionId) {
    return NextResponse.json({ error: "No subscription to resume" }, { status: 400 });
  }
  const stripe = requireStripe();
  await stripe.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: false });
  await db.subscription.update({ where: { id: sub.id }, data: { cancelAtPeriodEnd: false } });
  return ok({ ok: true });
});
