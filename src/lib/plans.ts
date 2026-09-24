import { db } from "./db";
import { getTrialSettings, getReferralSettings } from "./settings";
import { safeJsonParse } from "./utils";
import { currentMonthKey } from "./utils";
import type { Plan, User } from "@prisma/client";

export interface Entitlements {
  planKey: string;
  planName: string;
  billingPeriod: string;
  isTrial: boolean;
  isLifetime: boolean;
  trialEndsAt: Date | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: Date | null;

  maxVehicles: number;
  maxExpensesPerMonth: number;
  aiReceiptScansPerMonth: number;
  aiConversationsPerMonth: number;
  reportRetentionDays: number;
  forecastHorizonMonths: number;
  enableAdvancedScenarios: boolean;
  enableShareableReports: boolean;
  enableFamilySharing: boolean;
  enableApiAccess: boolean;

  features: string[];
  periodKey: string;
}

export async function getFreePlan(): Promise<Plan | null> {
  return db.plan.findFirst({ where: { key: "free", active: true } });
}

export async function getEntitlements(user: User): Promise<Entitlements> {
  const now = new Date();

  const subscription = await db.subscription.findFirst({
    where: { userId: user.id, status: { in: ["active", "trialing", "past_due", "lifetime"] } },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });

  if (subscription && subscription.status === "lifetime") {
    return planEntitlements(subscription.plan, {
      subscriptionStatus: "lifetime",
      currentPeriodEnd: null,
      trialEndsAt: null,
    });
  }

  if (subscription && (subscription.status === "active" || subscription.status === "trialing")) {
    const periodEnd = subscription.currentPeriodEnd;
    if (!periodEnd || periodEnd > now || subscription.cancelAtPeriodEnd === false) {
      return planEntitlements(subscription.plan, {
        subscriptionStatus: subscription.status,
        currentPeriodEnd: periodEnd,
        trialEndsAt: null,
      });
    }
  }

  const trial = await getTrialSettings();
  if (trial.trial_enabled && user.trialEndsAt && user.trialEndsAt > now) {
    const free = await getFreePlan();
    const base = free ?? (await db.plan.findFirst({ where: { key: "free" } }));
    if (base) {
      return {
        ...planEntitlements(base, {
          subscriptionStatus: "trialing",
          currentPeriodEnd: user.trialEndsAt,
          trialEndsAt: user.trialEndsAt,
        }),
        planKey: "trial",
        planName: "Free Trial",
        isTrial: true,
        maxVehicles: Math.max(base.maxVehicles, 2),
        maxExpensesPerMonth: Math.max(base.maxExpensesPerMonth, trial.trial_lead_limit ?? 200),
        forecastHorizonMonths: Math.max(base.forecastHorizonMonths, 24),
        aiReceiptScansPerMonth: 10,
        aiConversationsPerMonth: 25,
      };
    }
  }

  const free = user.planId
    ? await db.plan.findUnique({ where: { id: user.planId } })
    : await getFreePlan();
  if (free) {
    return planEntitlements(free, {
      subscriptionStatus: "free",
      currentPeriodEnd: null,
      trialEndsAt: user.trialEndsAt,
    });
  }

  return {
    planKey: "free",
    planName: "Free",
    billingPeriod: "FREE",
    isTrial: false,
    isLifetime: false,
    trialEndsAt: null,
    subscriptionStatus: "free",
    currentPeriodEnd: null,
    maxVehicles: 1,
    maxExpensesPerMonth: 50,
    aiReceiptScansPerMonth: 0,
    aiConversationsPerMonth: 0,
    reportRetentionDays: 30,
    forecastHorizonMonths: 12,
    enableAdvancedScenarios: false,
    enableShareableReports: false,
    enableFamilySharing: false,
    enableApiAccess: false,
    features: ["1 vehicle", "Basic tracking"],
    periodKey: currentMonthKey(),
  };
}

function planEntitlements(
  plan: Plan,
  extra: { subscriptionStatus: string; currentPeriodEnd: Date | null; trialEndsAt: Date | null }
): Entitlements {
  return {
    planKey: plan.key,
    planName: plan.name,
    billingPeriod: plan.billingPeriod,
    isTrial: false,
    isLifetime: plan.billingPeriod === "LIFETIME",
    trialEndsAt: extra.trialEndsAt,
    subscriptionStatus: extra.subscriptionStatus,
    currentPeriodEnd: extra.currentPeriodEnd,
    maxVehicles: plan.maxVehicles,
    maxExpensesPerMonth: plan.maxExpensesPerMonth,
    aiReceiptScansPerMonth: plan.aiReceiptScansPerMonth,
    aiConversationsPerMonth: plan.aiConversationsPerMonth,
    reportRetentionDays: plan.reportRetentionDays,
    forecastHorizonMonths: plan.forecastHorizonMonths,
    enableAdvancedScenarios: plan.enableAdvancedScenarios,
    enableShareableReports: plan.enableShareableReports,
    enableFamilySharing: plan.enableFamilySharing,
    enableApiAccess: plan.enableApiAccess,
    features: safeJsonParse<string[]>(plan.features, []),
    periodKey: currentMonthKey(),
  };
}

export class LimitReachedError extends Error {
  limitType: "vehicles" | "expenses" | "aiScans" | "aiConversations" | "api";
  constructor(limitType: LimitReachedError["limitType"], message: string) {
    super(message);
    this.limitType = limitType;
  }
}

export const UPGRADE_MESSAGE =
  "You've reached your current plan limit. Upgrade your plan to continue.";

void getReferralSettings;
