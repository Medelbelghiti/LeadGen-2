import { NextResponse } from "next/server";
import { withErrorHandling, ok } from "@/lib/http";
import { env } from "@/lib/env";
import { getStripe } from "@/lib/stripe-client";
import { handleStripeEvent } from "@/lib/stripe-webhook";
import { auditLog } from "@/lib/audit";

export const POST = withErrorHandling(async (req) => {
  if (!env.stripeWebhookSecret) {
    return NextResponse.json({ error: "Webhook is not configured on this server." }, { status: 503 });
  }
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Webhook is not configured on this server." }, { status: 503 });
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  const raw = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, env.stripeWebhookSecret);
  } catch {
    // Stripe signature error: generic public message, log details server-side.
    await auditLog({ action: "stripe.webhook.signature_invalid", metadata: { ip: req.headers.get("x-forwarded-for") ?? "" } });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    const outcome = await handleStripeEvent(event);
    return ok({ received: true, outcome });
  } catch (e) {
    // The handler has already marked the event FAILED and logged details.
    // Return 500 so Stripe retries the event.
    return NextResponse.json({ error: "Webhook processing failed; retrying." }, { status: 500 });
  }
});
