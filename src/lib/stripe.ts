import { db } from "./db";
import { requireStripe } from "./stripe-client";
import { getFreePlan, type Entitlements } from "./plans";
import { currentMonthKey } from "./utils";
import { processAffiliateCommission } from "./affiliates";
import { markReferralConverted } from "./referrals";
import { createNotification } from "./notifications";
import { sendEmail, tplPaymentSuccess, tplPaymentFailed, tplSubscriptionCanceled } from "./email";
import type Stripe from "stripe";

interface CheckoutInput {
  userId: string;
  planId: string;
  couponCode?: string | null;
  successUrl: string;
  cancelUrl: string;
}

export interface CouponValidation {
  valid: boolean;
  couponId?: string;
  error?: string;
  stripeCouponId?: string;
}

/** Validate a coupon against the database + Stripe parity. */
export async function validateCoupon(
  code: string,
  userId: string,
  planId: string
): Promise<CouponValidation> {
  const trimmed = code.trim().toUpperCase();
  const coupon = await db.coupon.findUnique({
    where: { code: trimmed },
    include: { redemptions: { where: { userId } } },
  });
  if (!coupon || !coupon.active) return { valid: false, error: "Coupon not found" };
  if (coupon.expiresAt && coupon.expiresAt < new Date())
    return { valid: false, error: "Coupon has expired" };
  if (coupon.maxRedemptions && coupon.timesRedeemed >= coupon.maxRedemptions)
    return { valid: false, error: "Coupon usage limit reached" };
  if (coupon.redemptions.length >= coupon.perUserLimit)
    return { valid: false, error: "You have already used this coupon" };

  const allowedPlans = safeJsonArray<string>(coupon.planKeys);
  if (allowedPlans.length > 0) {
    const plan = await db.plan.findUnique({ where: { id: planId } });
    if (!plan || !allowedPlans.includes(plan.key))
      return { valid: false, error: "Coupon not valid for this plan" };
  }

  if (coupon.firstPurchaseOnly) {
    const prior = await db.invoice.count({ where: { userId, status: "paid" } });
    if (prior > 0) return { valid: false, error: "Coupon is for first purchase only" };
  }

  if (coupon.minPurchaseCents) {
    const plan = await db.plan.findUnique({ where: { id: planId } });
    if (!plan || plan.priceCents < coupon.minPurchaseCents)
      return { valid: false, error: `Minimum purchase is ${(coupon.minPurchaseCents / 100).toFixed(2)}` };
  }

  // Ensure a Stripe coupon exists; create one if needed.
  let stripeCouponId = coupon.stripeCouponId;
  if (!stripeCouponId) {
    const stripe = requireStripe();
    const created = await stripe.coupons.create({
      duration: coupon.duration.toLowerCase() as Stripe.CouponCreateParams.Duration,
      name: coupon.code,
      ...(coupon.durationMonths ? { duration_in_months: coupon.durationMonths } : {}),
      ...(coupon.type === "PERCENT"
        ? { percent_off: coupon.value }
        : { amount_off: coupon.value, currency: "usd" }),
    });
    stripeCouponId = created.id;
    await db.coupon.update({ where: { id: coupon.id }, data: { stripeCouponId } });
  }

  return { valid: true, couponId: coupon.id, stripeCouponId };
}

export async function redeemCoupon(couponId: string, userId: string): Promise<void> {
  await db.coupon.update({
    where: { id: couponId },
    data: { timesRedeemed: { increment: 1 } },
  });
  await db.couponRedemption.create({ data: { couponId, userId } });
}

export async function createCheckoutSession(input: CheckoutInput): Promise<{ url: string; error?: string }> {
  const stripe = requireStripe();
  const user = await db.user.findUnique({ where: { id: input.userId } });
  const plan = await db.plan.findUnique({ where: { id: input.planId } });
  if (!user) return { url: "", error: "User not found" };
  if (!plan || !plan.active) return { url: "", error: "Plan not available" };
  if (!plan.stripePriceId) return { url: "", error: "This plan is not connected to Stripe yet" };

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name ?? undefined,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await db.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
  }

  const isLifetime = plan.billingPeriod === "LIFETIME";
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: isLifetime ? "payment" : "subscription",
    customer: customerId,
    success_url: input.successUrl + "?session_id={CHECKOUT_SESSION_ID}",
    cancel_url: input.cancelUrl,
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    allow_promotion_codes: true,
    client_reference_id: user.id,
    metadata: { userId: user.id, planId: plan.id, planKey: plan.key },
    subscription_data: isLifetime
      ? undefined
      : { metadata: { userId: user.id, planId: plan.id, planKey: plan.key } },
    payment_intent_data: isLifetime
      ? { metadata: { userId: user.id, planId: plan.id, planKey: plan.key } }
      : undefined,
  };

  if (input.couponCode) {
    const v = await validateCoupon(input.couponCode, user.id, plan.id);
    if (v.valid && v.stripeCouponId) {
      params.discounts = [{ coupon: v.stripeCouponId }];
      params.allow_promotion_codes = false;
    } else {
      return { url: "", error: v.error ?? "Invalid coupon" };
    }
  }

  const session = await stripe.checkout.sessions.create(params);
  if (!session.url) return { url: "", error: "Stripe did not return a session URL" };
  return { url: session.url };
}

export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<{ url: string }> {
  const stripe = requireStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return { url: session.url };
}

export async function cancelSubscription(opts: { atPeriodEnd: boolean }): Promise<{ ok: boolean; error?: string }> {
  const stripe = requireStripe();
  const sub = await db.subscription.findFirst({
    where: { stripeSubscriptionId: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  if (!sub?.stripeSubscriptionId) return { ok: false, error: "No active subscription" };
  if (opts.atPeriodEnd) {
    await stripe.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: true });
    await db.subscription.update({ where: { id: sub.id }, data: { cancelAtPeriodEnd: true } });
  } else {
    await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
    await db.subscription.update({
      where: { id: sub.id },
      data: { status: "canceled", canceledAt: new Date() },
    });
  }
  return { ok: true };
}

// --------------------------- Webhook processing ------------------------------

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  // The WebhookEvent table (unique eventId) provides idempotency: if the same event
  // is delivered twice, the second insert will fail and we skip processing.
  try {
    await db.webhookEvent.create({
      data: { eventId: event.id, type: event.type, processedAt: new Date() },
    });
  } catch {
    // duplicate — already processed
    return;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await onSubscriptionUpdated(event.data.object as Stripe.Subscription);
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
        break;
    }
    await db.webhookEvent.update({
      where: { eventId: event.id },
      data: { processedAt: new Date() },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.webhookEvent.update({
      where: { eventId: event.id },
      data: { error: msg },
    });
    throw e;
  }
}

async function onCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.metadata?.userId;
  const planId = session.metadata?.planId;
  if (!userId || !planId) return;
  const plan = await db.plan.findUnique({ where: { id: planId } });
  if (!plan) return;
  const isLifetime = plan.billingPeriod === "LIFETIME";

  await db.user.update({
    where: { id: userId },
    data: { planId: plan.id },
  });

  if (isLifetime) {
    await db.subscription.upsert({
      where: { stripeSubscriptionId: `lifetime_${userId}` },
      create: {
        userId,
        planId: plan.id,
        status: "lifetime",
        stripeSubscriptionId: `lifetime_${userId}`,
        currentPeriodStart: new Date(),
      },
      update: { planId: plan.id, status: "lifetime" },
    });
  }

  await db.user.update({ where: { id: userId }, data: { trialEndsAt: null, trialUsed: true } });
}

async function onSubscriptionUpdated(sub: Stripe.Subscription): Promise<void> {
  const userId = sub.metadata?.userId;
  const planId = sub.metadata?.planId;
  if (!userId || !planId) return;

  await db.subscription.upsert({
    where: { stripeSubscriptionId: sub.id },
    create: {
      userId,
      planId,
      stripeSubscriptionId: sub.id,
      status: sub.status,
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
    update: {
      planId,
      status: sub.status,
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
  // Downgrade to free plan if no other active subscription
  const stillActive = await db.subscription.count({
    where: { userId, status: { in: ["active", "trialing", "lifetime"] } },
  });
  if (stillActive === 0) {
    const free = await getFreePlan();
    if (free) await db.user.update({ where: { id: userId }, data: { planId: free.id } });
  }
  const user = await db.user.findUnique({ where: { id: userId } });
  if (user) {
    await createNotification({
      userId: user.id,
      type: "SUBSCRIPTION_CANCELED",
      title: "Your subscription was canceled",
      body: "You retain access until the end of the current billing period.",
      link: "/settings/billing",
    });
    const sub2 = await db.subscription.findFirst({
      where: { userId, stripeSubscriptionId: sub.id },
    });
    if (sub2?.currentPeriodEnd) {
      await sendEmail({
        ...tplSubscriptionCanceled(user.name, sub2.currentPeriodEnd.toISOString().slice(0, 10)),
        to: user.email,
      });
    }
  }
}

async function onInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const userId = (invoice.subscription_details?.metadata as Record<string, string> | undefined)?.userId
    ?? null;
  // If we cannot resolve userId via subscription metadata, attempt customer lookup
  let resolvedUserId = userId;
  if (!resolvedUserId && typeof invoice.customer === "string") {
    const u = await db.user.findUnique({ where: { stripeCustomerId: invoice.customer } });
    resolvedUserId = u?.id ?? null;
  }
  if (!resolvedUserId) return;

  await db.invoice.upsert({
    where: { stripeInvoiceId: invoice.id! },
    create: {
      userId: resolvedUserId,
      stripeInvoiceId: invoice.id!,
      number: invoice.number ?? null,
      amountCents: invoice.amount_paid,
      currency: invoice.currency,
      status: "paid",
      planName: (invoice.lines.data[0]?.description ?? null) ?? null,
      hostedUrl: invoice.hosted_invoice_url ?? null,
      pdfUrl: invoice.invoice_pdf ?? null,
      periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : null,
      periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : null,
    },
    update: {
      status: "paid",
      amountCents: invoice.amount_paid,
      hostedUrl: invoice.hosted_invoice_url ?? null,
      pdfUrl: invoice.invoice_pdf ?? null,
    },
  });

  // Affiliate commission + referral conversion
  await processAffiliateCommission({
    userId: resolvedUserId,
    invoiceAmountCents: invoice.amount_paid,
  });
  await markReferralConverted({
    referredUserId: resolvedUserId,
    revenueCents: invoice.amount_paid,
  });

  const user = await db.user.findUnique({ where: { id: resolvedUserId } });
  if (user) {
    await createNotification({
      userId: user.id,
      type: "PAYMENT_SUCCESS",
      title: "Payment successful",
      body: `${(invoice.amount_paid / 100).toFixed(2)} ${invoice.currency.toUpperCase()}`,
      link: "/settings/billing",
    });
    await sendEmail({
      ...tplPaymentSuccess(user.name, (invoice.lines.data[0]?.description ?? "your plan") || "your plan"),
      to: user.email,
    });
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
    create: {
      userId,
      stripeInvoiceId: invoice.id!,
      amountCents: invoice.amount_due,
      currency: invoice.currency,
      status: "open",
      planName: invoice.lines.data[0]?.description ?? null,
    },
    update: { status: "open" },
  });
  await createNotification({
    userId,
    type: "PAYMENT_FAILED",
    title: "Payment failed",
    body: "We could not process your most recent payment.",
    link: "/settings/billing",
  });
  await sendEmail({ ...tplPaymentFailed(user.name, "/settings/billing"), to: user.email });
}

async function onChargeRefunded(charge: Stripe.Charge): Promise<void> {
  const stripe = requireStripe();
  const stripeInvoiceId = (charge.invoice as string) ?? null;
  if (!stripeInvoiceId) return;
  const inv = await db.invoice.findUnique({ where: { stripeInvoiceId } });
  if (!inv) return;
  await db.invoice.update({ where: { id: inv.id }, data: { status: "refunded" } });
  void stripe; // keep import alive
}

// --------------------------- helpers ------------------------------

function safeJsonArray<T>(raw: string): T[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

export function getPlanByKey(key: string) {
  return db.plan.findUnique({ where: { key } });
}

export const _internal = { currentMonthKey };
