import { NextResponse } from "next/server";
import { withErrorHandling, parseJson, ok } from "@/lib/http";
import { CheckoutSchema } from "@/lib/schemas";
import { requireUser } from "@/lib/auth";
import { createCheckoutSession } from "@/lib/stripe";
import { env } from "@/lib/env";
import { trackEvent } from "@/lib/analytics";

export const POST = withErrorHandling(async (req) => {
  const user = await requireUser();
  const body = await parseJson(req, CheckoutSchema);
  await trackEvent("checkout_started", { userId: user.id, metadata: { planId: body.planId } });
  const res = await createCheckoutSession({
    userId: user.id,
    planId: body.planId,
    couponCode: body.couponCode,
    successUrl: `${env.appUrl}/dashboard?upgraded=1`,
    cancelUrl: `${env.appUrl}/pricing`,
  });
  if (res.error) return NextResponse.json({ error: res.error }, { status: 400 });
  return ok({ url: res.url });
});
