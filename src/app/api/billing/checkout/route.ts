import { NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling, parseJson, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { createCheckoutSession } from "@/lib/stripe";
import { env } from "@/lib/env";
import { trackEvent } from "@/lib/analytics";

const Schema = z.object({ planId: z.string().min(1), couponCode: z.string().optional() });

export const POST = withErrorHandling(async (req) => {
  const user = await requireUser();
  const body = await parseJson(req, Schema);
  await trackEvent("checkout_started", { userId: user.id, metadata: { planId: body.planId } });
  const res = await createCheckoutSession({
    userId: user.id,
    planId: body.planId,
    couponCode: body.couponCode ?? null,
    successUrl: `${env.appUrl}/dashboard?upgraded=1`,
    cancelUrl: `${env.appUrl}/pricing`,
  });
  if (res.error) return NextResponse.json({ error: res.error }, { status: 400 });
  return ok({ url: res.url });
});
