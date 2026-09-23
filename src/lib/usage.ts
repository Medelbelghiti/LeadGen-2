import { db } from "./db";
import { currentDayKey, currentMonthKey } from "./utils";

export type UsageAction = "LEAD" | "SEARCH" | "EXPORT" | "PROVIDER_REQUEST" | "API_REQUEST";

/** Record a usage event in the ledger. This is the single source of truth for usage. */
export async function recordUsage(params: {
  userId: string;
  action: UsageAction;
  quantity?: number;
  provider?: string;
  searchId?: string;
  planKey?: string;
  periodKey?: string;
}): Promise<void> {
  await db.usageLedger.create({
    data: {
      userId: params.userId,
      action: params.action,
      quantity: params.quantity ?? 1,
      provider: params.provider,
      searchId: params.searchId,
      planKey: params.planKey,
      periodKey: params.periodKey ?? currentMonthKey(),
    },
  });
}

export async function getUsageCount(
  userId: string,
  action: UsageAction,
  periodKey: string
): Promise<number> {
  const agg = await db.usageLedger.aggregate({
    where: { userId, action, periodKey },
    _sum: { quantity: true },
  });
  return agg._sum.quantity ?? 0;
}

export async function getMonthlyUsage(userId: string, periodKey = currentMonthKey()) {
  const [leads, searches, exports, apiRequests] = await Promise.all([
    getUsageCount(userId, "LEAD", periodKey),
    getUsageCount(userId, "SEARCH", periodKey),
    getUsageCount(userId, "EXPORT", periodKey),
    getUsageCount(userId, "API_REQUEST", periodKey),
  ]);
  return { leads, searches, exports, apiRequests, periodKey };
}

export async function getDailySearchCount(userId: string): Promise<number> {
  return getUsageCount(userId, "SEARCH", currentDayKey());
}

/** Total usage across an arbitrary set of period keys (used for trial window). */
export async function getUsageSince(userId: string, action: UsageAction, since: Date): Promise<number> {
  const agg = await db.usageLedger.aggregate({
    where: { userId, action, createdAt: { gte: since } },
    _sum: { quantity: true },
  });
  return agg._sum.quantity ?? 0;
}

export async function recordProviderUsage(params: {
  provider: string;
  userId?: string;
  searchId?: string;
  requests: number;
  results: number;
  estimatedCostCents?: number;
}): Promise<void> {
  await db.providerUsage.create({
    data: {
      provider: params.provider,
      userId: params.userId,
      searchId: params.searchId,
      requests: params.requests,
      results: params.results,
      estimatedCostCents: params.estimatedCostCents ?? 0,
      periodKey: currentMonthKey(),
    },
  });
}

export async function getProviderRequestCount(
  provider: string,
  periodKey: string
): Promise<number> {
  const agg = await db.providerUsage.aggregate({
    where: { provider, periodKey },
    _sum: { requests: true },
  });
  return agg._sum.requests ?? 0;
}
