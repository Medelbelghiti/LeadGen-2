import { NextResponse } from "next/server";
import { withErrorHandling, ok } from "@/lib/http";
import { env, stripeConfigured } from "@/lib/env";
import { getStripe } from "@/lib/stripe-client";
import { handleStripeEvent } from "@/lib/stripe";
import { auditLog } from "@/lib/audit";

export const POST = withErrorHandling(async (req) => {
  if (!env.stripeWebhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 503 });
  }
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  const raw = await req.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, env.stripeWebhookSecret);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await auditLog({ action: "stripe.webhook.signature_invalid", metadata: { msg } });
    return NextResponse.json({ error: `Invalid signature: ${msg}` }, { status: 400 });
  }
  await handleStripeEvent(event);
  return ok({ received: true });
});

void stripeConfigured;
