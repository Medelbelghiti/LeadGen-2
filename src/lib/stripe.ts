import { db } from "./db";
import { requireStripe } from "./stripe-client";
import { getFreePlan } from "./plans";
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

export async function cancelSubscription(opts: { userId: string; atPeriodEnd: boolean }): Promise<{ ok: boolean; error?: string }> {
  const stripe = requireStripe();
  const sub = await db.subscription.findFirst({
    where: { userId: opts.userId, stripeSubscriptionId: { not: null } },
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
