import { db } from "./db";
import { currentMonthKey } from "./utils";

export type UsageAction = "EXPENSE" | "AI_SCAN" | "AI_CONVERSATION" | "API_CALL";

export interface MonthlyUsage {
  expenses: number;
  aiScans: number;
  aiConversations: number;
  apiCalls: number;
  periodKey: string;
}

export async function getMonthlyUsage(userId: string): Promise<MonthlyUsage> {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);

  const [expenses, aiScans, aiConversations, apiCalls] = await Promise.all([
    db.expense.count({ where: { userId, date: { gte: start } } }),
    db.expense.count({ where: { userId, source: "receipt_scan", date: { gte: start } } }),
    db.conversation.count({ where: { userId, createdAt: { gte: start } } }),
    db.auditLog.count({
      where: { userId, action: "api.call", createdAt: { gte: start } },
    }),
  ]);

  return { expenses, aiScans, aiConversations, apiCalls, periodKey: currentMonthKey() };
}
