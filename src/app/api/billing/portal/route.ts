import { NextResponse } from "next/server";
import { withErrorHandling, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { createBillingPortalSession } from "@/lib/stripe";
import { env } from "@/lib/env";

export const POST = withErrorHandling(async () => {
  const user = await requireUser();
  if (!user.stripeCustomerId) {
    return NextResponse.json({ error: "No Stripe customer for this account yet" }, { status: 400 });
  }
  const res = await createBillingPortalSession(user.stripeCustomerId, `${env.appUrl}/settings`);
  return ok({ url: res.url });
});
