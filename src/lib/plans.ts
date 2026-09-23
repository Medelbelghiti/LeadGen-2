import { db } from "./db";
import { getTrialSettings } from "./settings";
import { safeJsonParse, currentMonthKey } from "./utils";
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
  monthlyLeadLimit: number; // includes referral bonus leads
  monthlySearchLimit: number;
  dailySearchLimit: number;
  exportLimit: number;
  maxResultsPerSearch: number;
  providers: string[];
  features: string[];
  teamMembersLimit: number;
  apiAccess: boolean;
  apiMonthlyQuota: number;
  /** UsageLedger period key used for monthly counters (trial uses a per-user key). */
  periodKey: string;
}

const FREE_FALLBACK = {
  key: "free",
  name: "Free",
  billingPeriod: "FREE",
  monthlyLeadLimit: 50,
  monthlySearchLimit: 10,
  dailySearchLimit: 3,
  exportLimit: 25,
  maxResultsPerSearch: 25,
  providers: ["demo"],
  features: [] as string[],
  teamMembersLimit: 1,
  apiAccess: false,
  apiMonthlyQuota: 0,
};

export async function getFreePlan(): Promise<Plan | null> {
  return db.plan.findFirst({ where: { key: "free", active: true } });
}

/**
 * Resolve the effective entitlements for a user:
 * - Active/trialing paid subscription → that plan
 * - Lifetime purchase → lifetime plan (no recurring billing)
 * - Trial window → admin-configured trial limits
 * - Otherwise → free plan
 */
export async function getEntitlements(user: User): Promise<Entitlements> {
  const now = new Date();

  const subscription = await db.subscription.findFirst({
    where: {
      userId: user.id,
      status: { in: ["active", "trialing", "past_due", "lifetime"] },
    },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });

  if (subscription && subscription.status !== "lifetime") {
    const periodEnd = subscription.currentPeriodEnd;
    if (!periodEnd || periodEnd > now || subscription.cancelAtPeriodEnd === false) {
      return planEntitlements(subscription.plan, user, {
        subscriptionStatus: subscription.status,
        currentPeriodEnd: periodEnd,
      });
    }
  }

  if (subscription && subscription.status === "lifetime") {
    return planEntitlements(subscription.plan, user, {
      subscriptionStatus: "lifetime",
      currentPeriodEnd: null,
    });
  }

  // Direct plan assignment (e.g. admin grant or lifetime set on user row)
  if (user.planId) {
    const plan = await db.plan.findUnique({ where: { id: user.planId } });
    if (plan && plan.billingPeriod === "LIFETIME") {
      return planEntitlements(plan, user, {
        subscriptionStatus: "lifetime",
        currentPeriodEnd: null,
      });
    }
  }

  // Trial window
  const trial = await getTrialSettings();
  if (trial.trial_enabled && user.trialEndsAt && user.trialEndsAt > now) {
    return {
      planKey: "trial",
      planName: "Free Trial",
      billingPeriod: "TRIAL",
      isTrial: true,
      isLifetime: false,
      trialEndsAt: user.trialEndsAt,
      subscriptionStatus: "trialing",
      currentPeriodEnd: user.trialEndsAt,
      monthlyLeadLimit: trial.trial_lead_limit + user.bonusLeads,
      monthlySearchLimit: trial.trial_search_limit,
      dailySearchLimit: trial.trial_search_limit,
      exportLimit: trial.trial_export_limit,
      maxResultsPerSearch: Math.min(50, trial.trial_lead_limit),
      providers: ["demo", "openstreetmap"],
      features: [],
      teamMembersLimit: 1,
      apiAccess: false,
      apiMonthlyQuota: 0,
      periodKey: `trial:${user.id}`,
    };
  }

  // Free plan
  const freePlan = user.planId
    ? await db.plan.findUnique({ where: { id: user.planId } })
    : await getFreePlan();

  if (freePlan) {
    return planEntitlements(freePlan, user, {
      subscriptionStatus: "free",
      currentPeriodEnd: null,
    });
  }

  return {
    planKey: FREE_FALLBACK.key,
    planName: FREE_FALLBACK.name,
    billingPeriod: "FREE",
    isTrial: false,
    isLifetime: false,
    trialEndsAt: null,
    subscriptionStatus: "free",
    currentPeriodEnd: null,
    monthlyLeadLimit: FREE_FALLBACK.monthlyLeadLimit + user.bonusLeads,
    monthlySearchLimit: FREE_FALLBACK.monthlySearchLimit,
    dailySearchLimit: FREE_FALLBACK.dailySearchLimit,
    exportLimit: FREE_FALLBACK.exportLimit,
    maxResultsPerSearch: FREE_FALLBACK.maxResultsPerSearch,
    providers: FREE_FALLBACK.providers,
    features: FREE_FALLBACK.features,
    teamMembersLimit: FREE_FALLBACK.teamMembersLimit,
    apiAccess: FREE_FALLBACK.apiAccess,
    apiMonthlyQuota: FREE_FALLBACK.apiMonthlyQuota,
    periodKey: currentMonthKey(),
  };
}

function planEntitlements(
  plan: Plan,
  user: User,
  extra: { subscriptionStatus: string; currentPeriodEnd: Date | null }
): Entitlements {
  return {
    planKey: plan.key,
    planName: plan.name,
    billingPeriod: plan.billingPeriod,
    isTrial: false,
    isLifetime: plan.billingPeriod === "LIFETIME",
    trialEndsAt: user.trialEndsAt,
    subscriptionStatus: extra.subscriptionStatus,
    currentPeriodEnd: extra.currentPeriodEnd,
    monthlyLeadLimit: plan.monthlyLeadLimit + user.bonusLeads,
    monthlySearchLimit: plan.monthlySearchLimit,
    dailySearchLimit: plan.dailySearchLimit,
    exportLimit: plan.exportLimit,
    maxResultsPerSearch: plan.maxResultsPerSearch,
    providers: safeJsonParse<string[]>(plan.providers, ["demo"]),
    features: safeJsonParse<string[]>(plan.features, []),
    teamMembersLimit: plan.teamMembersLimit,
    apiAccess: plan.apiAccess,
    apiMonthlyQuota: plan.apiMonthlyQuota,
    periodKey: currentMonthKey(),
  };
}

export class LimitReachedError extends Error {
  limitType: "leads" | "searches" | "exports" | "results" | "api";
  constructor(limitType: LimitReachedError["limitType"], message: string) {
    super(message);
    this.limitType = limitType;
  }
}

export const UPGRADE_MESSAGE =
  "You've reached your current plan limit. Upgrade your plan to continue.";
