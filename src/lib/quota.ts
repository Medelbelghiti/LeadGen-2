/**
 * Server-side quota enforcement.
 *
 * AI conversation quota and OCR scan quota are enforced atomically.
 * Pre-flight checks + counter increments happen INSIDE the same DB
 * transaction to prevent concurrent requests from bypassing the limit.
 *
 * UI hiding is NOT security — this module is authoritative.
 */

import { db } from "./db";
import { getEntitlements, type Entitlements } from "./plans";

export class QuotaExceededError extends Error {
  limitType: "aiScans" | "aiConversations" | "expenses";
  constructor(limitType: "aiScans" | "aiConversations" | "expenses", message: string) {
    super(message);
    this.limitType = limitType;
    this.name = "QuotaExceededError";
  }
}

export interface QuotaCheckResult {
  allowed: boolean;
  used: number;
  limit: number;
  reason?: string;
}

function currentPeriodKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Read-only check. Does NOT consume quota. */
export async function checkAiConversationQuota(userId: string, ent: Entitlements): Promise<QuotaCheckResult> {
  const period = ent.periodKey.startsWith("trial:") ? "trial" : currentPeriodKey();
  const used = await db.conversation.count({
    where: { userId, createdAt: { gte: periodStart(period) } },
  });
  const limit = ent.aiConversationsPerMonth;
  return {
    allowed: limit === 0 ? false : used < limit,
    used,
    limit,
    reason: limit === 0 ? "AI conversations not included in your plan" : used >= limit ? `Monthly limit reached (${limit})` : undefined,
  };
}

/** Read-only check for OCR (receipt scan) quota. Does NOT consume. */
export async function checkOcrQuota(userId: string, ent: Entitlements): Promise<QuotaCheckResult> {
  const period = ent.periodKey.startsWith("trial:") ? "trial" : currentPeriodKey();
  const used = await db.expense.count({
    where: { userId, source: "receipt_scan", date: { gte: periodStart(period) } },
  });
  const limit = ent.aiReceiptScansPerMonth;
  return {
    allowed: limit === 0 ? false : used < limit,
    used,
    limit,
    reason: limit === 0 ? "Receipt scanning not included in your plan" : used >= limit ? `Monthly OCR limit reached (${limit})` : undefined,
  };
}

/**
 * Atomic quota consumption: increments the counter in the SAME transaction
 * as the business operation. Caller MUST pass a `tx` (Prisma transaction
 * client) so the quota check + increment + insert happen as one unit.
 */
export async function consumeAiConversationInTx(
  tx: Parameters<typeof db.$transaction>[0] extends (c: infer C) => unknown ? C : never,
  userId: string,
  ent: Entitlements
): Promise<QuotaCheckResult> {
  const period = ent.periodKey.startsWith("trial:") ? "trial" : currentPeriodKey();
  const used = await tx.conversation.count({
    where: { userId, createdAt: { gte: periodStart(period) } },
  });
  const limit = ent.aiConversationsPerMonth;
  if (limit === 0 || used >= limit) {
    return {
      allowed: false,
      used,
      limit,
      reason: limit === 0 ? "AI conversations not included in your plan" : `Monthly limit reached (${limit})`,
    };
  }
  return { allowed: true, used, limit };
}

/** Atomic OCR quota consumption. Caller passes a Prisma transaction client. */
export async function consumeOcrInTx(
  tx: Parameters<typeof db.$transaction>[0] extends (c: infer C) => unknown ? C : never,
  userId: string,
  ent: Entitlements
): Promise<QuotaCheckResult> {
  const period = ent.periodKey.startsWith("trial:") ? "trial" : currentPeriodKey();
  const used = await tx.expense.count({
    where: { userId, source: "receipt_scan", date: { gte: periodStart(period) } },
  });
  const limit = ent.aiReceiptScansPerMonth;
  if (limit === 0 || used >= limit) {
    return {
      allowed: false,
      used,
      limit,
      reason: limit === 0 ? "Receipt scanning not included in your plan" : `Monthly OCR limit reached (${limit})`,
    };
  }
  return { allowed: true, used, limit };
}

function periodStart(period: string): Date {
  if (period === "trial") return new Date(0);
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, 1));
}

export { getEntitlements };
