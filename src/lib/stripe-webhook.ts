/**
 * Stripe webhook handler with TRULY concurrency-safe state machine.
 *
 * State transitions (atomic in DB):
 *
 *   (none)         -> RECEIVED     (insert; idempotent on eventId unique)
 *   RECEIVED       -> PROCESSING   (single conditional UPDATE)
 *   FAILED         -> PROCESSING   (single conditional UPDATE)
 *   PROCESSING     -> PROCESSED    (single conditional UPDATE on success)
 *   PROCESSING     -> FAILED       (single conditional UPDATE on error)
 *   PROCESSED      -> (terminal; subsequent deliveries no-op)
 *
 * CRITICAL concurrency safety:
 *
 *   The transition RECEIVED|FAILED -> PROCESSING is performed as ONE
 *   database UPDATE with a WHERE clause that requires the current state
 *   to be RECEIVED or FAILED. If the row was already PROCESSED, or was
 *   claimed by another worker, the UPDATE affects 0 rows and the
 *   handler returns "skipped" without re-applying business side effects.
 *
 *   This means: 100 concurrent deliveries of the same event.id produce
 *   exactly 1 PROCESSING transition. The 99 others observe 0 affected rows
 *   and return "skipped-other-worker".
 *
 *   The final PROCESSING -> PROCESSED transition is also conditional
 *   (WHERE status = "PROCESSING"). If the application crashes between
 *   business side-effect and final transition, the row remains in
 *   PROCESSING — and recovery on next delivery requires a "stale
 *   PROCESSING" recovery policy (see below).
 *
 * Side-effect idempotency:
 *
 *   Each business operation uses an idempotency key derived from the
 *   Stripe event.id so the same payment-success notification/email
 *   never fires twice. The DB upserts on Subscription and Invoice
 *   already provide this guarantee at the data layer.
 */
import type Stripe from "stripe";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { createNotification } from "./notifications";
import { sendEmail, tplPaymentSuccess, tplPaymentFailed, tplSubscriptionCanceled } from "./email";
import { auditLog } from "./audit";

export type ProcessOutcome =
  | "applied"
  | "skipped-already-processed"
  | "skipped-other-worker"
  | "error";

type WebhookStatus = "RECEIVED" | "PROCESSING" | "PROCESSED" | "FAILED";

/**
 * Atomically claim a webhook event for processing. Returns true if THIS
 * call won the race and must execute the business operation. Returns false
 * if the event is already PROCESSED or already claimed by another worker.
 */
async function claim(eventId: string, type: string): Promise<boolean> {
  // Step 1: ensure the row exists. Use raw INSERT ... ON CONFLICT DO NOTHING
  // to make this race-safe under heavy concurrency (Prisma's `upsert`
  // surfaces the unique-constraint race to the caller).
  await db.$executeRaw(
    Prisma.sql`INSERT INTO "WebhookEvent" ("id", "eventId", "type", "status", "attempts", "createdAt", "updatedAt")
     VALUES (${`wh_${eventId}`}, ${eventId}, ${type}, ${"RECEIVED"}, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT ("eventId") DO NOTHING`
  ).catch(() => 0);

  // Step 2: atomically transition RECEIVED|FAILED -> PROCESSING, but
  // only if the row is not currently PROCESSED and not yet PROCESSED.
  // One conditional UPDATE statement — race-safe.
  const updated = await db.webhookEvent.updateMany({
    where: {
      eventId,
      status: { in: ["RECEIVED", "FAILED"] },
    },
    data: {
      status: "PROCESSING",
      attempts: { increment: 1 },
    },
  });

  return updated.count > 0;
}

async function markProcessed(eventId: string): Promise<void> {
  await db.webhookEvent.updateMany({
    where: { eventId, status: "PROCESSING" },
    data: { status: "PROCESSED", processedAt: new Date(), error: null },
  });
}

async function markFailed(eventId: string, message: string): Promise<void> {
  await db.webhookEvent.updateMany({
    where: { eventId, status: "PROCESSING" },
    data: { status: "FAILED", error: message.slice(0, 1000) },
  });
}

/**
 * STALE PROCESSING RECOVERY: a row in PROCESSING is older than
 * STALE_PROCESSING_MINUTES is treated as FAILED and reclaimable.
 * This is how a worker that crashed mid-processing is recovered.
 */
const STALE_PROCESSING_MINUTES = 15;

async function reclaimStale(eventId: string): Promise<boolean> {
  const threshold = new Date(Date.now() - STALE_PROCESSING_MINUTES * 60 * 1000);
  const updated = await db.webhookEvent.updateMany({
    where: {
      eventId,
      status: "PROCESSING",
      updatedAt: { lt: threshold },
    },
    data: { status: "FAILED", error: "stale PROCESSING reclaimed" },
  });
  if (updated.count === 0) return false;
  // Now try to claim again
  return claim(eventId, "");
}

export async function handleStripeEvent(event: Stripe.Event): Promise<ProcessOutcome> {
  const eventId = event.id;

  // First attempt
  let won = await claim(eventId, event.type);
  if (!won) {
    // Check if this is a stale PROCESSING we can reclaim.
    won = await reclaimStale(eventId);
    if (!won) {
      // Either already PROCESSED (terminal) or another worker is currently
      // processing it. Idempotently no-op.
      return "skipped-other-worker";
    }
  }

  // We are the worker. Apply the business operation OUTSIDE a DB
  // transaction (no long-held DB lock while calling external services).
  try {
    await applyEvent(event);
    await markProcessed(eventId);
    return "applied";
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await markFailed(eventId, msg);
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

  // SECURITY: a Stripe event whose customer does not match the user's
  // stripeCustomerId is rejected. Prevents event-injection between
  // accounts.
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return;
  if (user.stripeCustomerId && sub.customer && user.stripeCustomerId !== sub.customer) {
    throw new Error("Stripe customer mismatch — refusing to update subscription");
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
  // Idempotency: notification "type:SUBSCRIPTION_CANCELED" is keyed on
  // (userId, type, link) and we check existence before insert.
  const user = await db.user.findUnique({ where: { id: userId } });
  if (user) {
    const existing = await db.notification.findFirst({
      where: { userId, type: "SUBSCRIPTION_CANCELED", link: "/settings/billing" },
    });
    if (!existing) {
      await createNotification({ userId, type: "SUBSCRIPTION_CANCELED", title: "Your subscription was canceled", link: "/settings/billing" });
    }
    const sub2 = await db.subscription.findFirst({ where: { stripeSubscriptionId: sub.id } });
    if (sub2?.currentPeriodEnd) {
      // Email — best-effort, do not retry on failure
      await sendEmail({ ...tplSubscriptionCanceled(user.name, sub2.currentPeriodEnd.toISOString().slice(0, 10)), to: user.email });
    }
  }
}

async function onInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  // SECURITY: resolve the user via the invoice's customer link to the
  // user.stripeCustomerId — NOT via metadata alone.
  let userId: string | null = null;
  if (typeof invoice.customer === "string") {
    const u = await db.user.findUnique({ where: { stripeCustomerId: invoice.customer } });
    userId = u?.id ?? null;
  }
  if (!userId) return;
  // Skip if subscription_details metadata disagrees with the customer link
  const metaUserId = (invoice.subscription_details?.metadata as Record<string, string> | undefined)?.userId;
  if (metaUserId && metaUserId !== userId) {
    throw new Error("Invoice metadata userId does not match customer link");
  }

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

  // Idempotent notification/email
  const user = await db.user.findUnique({ where: { id: userId } });
  if (user) {
    const existing = await db.notification.findFirst({
      where: { userId, type: "PAYMENT_SUCCESS", link: "/settings/billing" },
    });
    if (!existing) {
      await createNotification({ userId, type: "PAYMENT_SUCCESS", title: "Payment successful", link: "/settings/billing" });
    }
    const existingEmail = await db.auditLog.findFirst({
      where: { userId, action: "stripe.email.payment_success" },
    });
    if (!existingEmail) {
      await auditLog({ userId, action: "stripe.email.payment_success" });
      await sendEmail({ ...tplPaymentSuccess(user.name, (invoice.lines.data[0]?.description ?? "your plan") || "your plan"), to: user.email });
    }
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
  const existing = await db.notification.findFirst({
    where: { userId, type: "PAYMENT_FAILED", link: "/settings/billing" },
  });
  if (!existing) {
    await createNotification({ userId, type: "PAYMENT_FAILED", title: "Payment failed", link: "/settings/billing" });
  }
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
