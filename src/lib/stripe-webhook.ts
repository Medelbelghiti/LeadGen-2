/**
 * Stripe webhook handler with a robust state machine.
 *
 * State transitions:
 *   (new)        -> RECEIVED     (record created; PROCESSED == null)
 *   RECEIVED     -> PROCESSING   (Stripe may retry while PROCESSING)
 *   PROCESSING   -> PROCESSED    (success)
 *   PROCESSING   -> FAILED       (transient failure; Stripe must retry)
 *   FAILED       -> PROCESSING   (retry attempt)
 *   PROCESSED    -> (terminal; idempotent skip)
 *
 * CRITICAL:
 *   - Never lose track of a FAILED event. Stripe relies on a non-2xx to retry.
 *   - Never double-apply business effects. Idempotency key = Stripe event.id.
 */

import type Stripe from "stripe";
import { db } from "./db";
import { createNotification } from "./notifications";
import { sendEmail, tplPaymentSuccess, tplPaymentFailed, tplSubscriptionCanceled } from "./email";
import { auditLog } from "./audit";

type WebhookStatus = "RECEIVED" | "PROCESSING" | "PROCESSED" | "FAILED";

export type ProcessOutcome = "applied" | "skipped-already-processed" | "skipped-other-user" | "error";

export async function handleStripeEvent(event: Stripe.Event): Promise<ProcessOutcome> {
  const eventId = event.id;

  // Step 1: atomically reserve the event for processing.
  // Either insert a new row (status=PROCESSING) OR recover an existing one.
  let eventRowId: string;
  let alreadyProcessed = false;
  try {
    const row = await db.webhookEvent.create({
      data: {
        eventId,
        type: event.type,
        status: "PROCESSING",
        attempts: 1,
      },
    });
    eventRowId = row.id;
  } catch {
    // Duplicate — already exists.
    const existing = await db.webhookEvent.findUnique({ where: { eventId } });
    if (!existing) throw new Error("WebhookEvent race: missing after duplicate error");

    if (existing.status === "PROCESSED") {
      alreadyProcessed = true;
      eventRowId = existing.id;
    } else {
      // FAILED or RECEIVED — recover. Increment attempts, mark PROCESSING.
      const updated = await db.webhookEvent.update({
        where: { id: existing.id },
        data: {
          status: "PROCESSING",
          attempts: { increment: 1 },
        },
      });
      eventRowId = updated.id;
    }
  }

  if (alreadyProcessed) {
    return "skipped-already-processed";
  }

  // Step 2: execute the business operation.
  try {
    await applyEvent(event);

    // Step 3: mark PROCESSED.
    await db.webhookEvent.update({
      where: { id: eventRowId },
      data: { status: "PROCESSED", processedAt: new Date(), error: null },
    });
    return "applied";
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.webhookEvent.update({
      where: { id: eventRowId },
      data: { status: "FAILED", error: msg.slice(0, 1000) },
    });
    await auditLog({ action: "stripe.webhook.failed", metadata: { eventId, type: event.type, message: msg } });
    throw e; // Caller returns 500 so Stripe retries.
  }
}

async function applyEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      await onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await onSubscriptionUpsert(event.data.object as Stripe.Subscription);
      break;
    case "customer.subscription.deleted":
      await onSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    case "invoice.paid":
      await onInvoicePaid(event.data.object as Stripe.Invoice);
      break;
    case "invoice.payment_failed":
      await onInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    case "charge.refunded":
      await onChargeRefunded(event.data.object as Stripe.Charge);
      break;
    default:
      // Unknown event types are ignored — not an error.
      return;
  }
}

async function onCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.metadata?.userId;
  const planId = session.metadata?.planId;
  if (!userId || !planId) return;
  const plan = await db.plan.findUnique({ where: { id: planId } });
  if (!plan) return;
  const isLifetime = plan.billingPeriod === "LIFETIME";

  await db.user.update({ where: { id: userId }, data: { planId: plan.id } });

  if (isLifetime) {
    await db.subscription.upsert({
      where: { stripeSubscriptionId: `lifetime_${userId}` },
      create: { userId, planId: plan.id, status: "lifetime", stripeSubscriptionId: `lifetime_${userId}`, currentPeriodStart: new Date() },
      update: { planId: plan.id, status: "lifetime" },
    });
  }
  await db.user.update({ where: { id: userId }, data: { trialEndsAt: null, trialUsed: true } });
}

async function onSubscriptionUpsert(sub: Stripe.Subscription): Promise<void> {
  const userId = sub.metadata?.userId;
  const planId = sub.metadata?.planId;
  if (!userId || !planId) return;
  const status = sub.status;

  // CRITICAL: a subscription event MUST NEVER change a subscription owned by
  // a DIFFERENT user. The Stripe customer ID is the stable link.
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return;
  if (user.stripeCustomerId && sub.customer && user.stripeCustomerId !== sub.customer) {
    throw new Error("Stripe customer mismatch — refusing to update");
  }

  await db.subscription.upsert({
    where: { stripeSubscriptionId: sub.id },
    create: {
      userId, planId, stripeSubscriptionId: sub.id, status,
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
    update: {
      planId, status,
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
  });
  await db.user.update({ where: { id: userId }, data: { planId } });
}

async function onSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
  const userId = sub.metadata?.userId;
  if (!userId) return;
  await db.subscription.updateMany({
    where: { stripeSubscriptionId: sub.id },
    data: { status: "canceled", canceledAt: new Date() },
  });
  const stillActive = await db.subscription.count({ where: { userId, status: { in: ["active", "trialing", "lifetime"] } } });
  if (stillActive === 0) {
    const free = await db.plan.findFirst({ where: { key: "free" } });
    if (free) await db.user.update({ where: { id: userId }, data: { planId: free.id } });
  }
  const user = await db.user.findUnique({ where: { id: userId } });
  if (user) {
    await createNotification({ userId, type: "SUBSCRIPTION_CANCELED", title: "Your subscription was canceled", link: "/settings/billing" });
    const sub2 = await db.subscription.findFirst({ where: { stripeSubscriptionId: sub.id } });
    if (sub2?.currentPeriodEnd) {
      await sendEmail({ ...tplSubscriptionCanceled(user.name, sub2.currentPeriodEnd.toISOString().slice(0, 10)), to: user.email });
    }
  }
}

async function onInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  let userId: string | null = (invoice.subscription_details?.metadata as Record<string, string> | undefined)?.userId ?? null;
  if (!userId && typeof invoice.customer === "string") {
    const u = await db.user.findUnique({ where: { stripeCustomerId: invoice.customer } });
    userId = u?.id ?? null;
  }
  if (!userId) return;
  await db.invoice.upsert({
    where: { stripeInvoiceId: invoice.id! },
    create: {
      userId, stripeInvoiceId: invoice.id!, number: invoice.number ?? null,
      amountCents: invoice.amount_paid, currency: invoice.currency, status: "paid",
      planName: (invoice.lines.data[0]?.description ?? null) ?? null,
      hostedUrl: invoice.hosted_invoice_url ?? null, pdfUrl: invoice.invoice_pdf ?? null,
      periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : null,
      periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : null,
    },
    update: { status: "paid", amountCents: invoice.amount_paid, hostedUrl: invoice.hosted_invoice_url ?? null, pdfUrl: invoice.invoice_pdf ?? null },
  });
  const user = await db.user.findUnique({ where: { id: userId } });
  if (user) {
    await createNotification({ userId, type: "PAYMENT_SUCCESS", title: "Payment successful", link: "/settings/billing" });
    await sendEmail({ ...tplPaymentSuccess(user.name, (invoice.lines.data[0]?.description ?? "your plan") || "your plan"), to: user.email });
  }
}

async function onInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  let userId: string | null = null;
  if (typeof invoice.customer === "string") {
    const u = await db.user.findUnique({ where: { stripeCustomerId: invoice.customer } });
    userId = u?.id ?? null;
  }
  if (!userId) return;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return;
  await db.invoice.upsert({
    where: { stripeInvoiceId: invoice.id! },
    create: { userId, stripeInvoiceId: invoice.id!, amountCents: invoice.amount_due, currency: invoice.currency, status: "open" },
    update: { status: "open" },
  });
  await createNotification({ userId, type: "PAYMENT_FAILED", title: "Payment failed", link: "/settings/billing" });
  await sendEmail({ ...tplPaymentFailed(user.name, "/settings/billing"), to: user.email });
}

async function onChargeRefunded(charge: Stripe.Charge): Promise<void> {
  const stripeInvoiceId = (charge.invoice as string) ?? null;
  if (!stripeInvoiceId) return;
  const inv = await db.invoice.findUnique({ where: { stripeInvoiceId } });
  if (!inv) return;
  await db.invoice.update({ where: { id: inv.id }, data: { status: "refunded" } });
}

export type { WebhookStatus };
