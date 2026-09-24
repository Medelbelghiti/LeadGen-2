import { db } from "./db";

export type NotificationType =
  | "SEARCH_COMPLETE" | "USAGE_WARNING" | "USAGE_LIMIT" | "TRIAL_ENDING"
  | "PAYMENT_SUCCESS" | "PAYMENT_FAILED" | "SUBSCRIPTION_CANCELED"
  | "GENERAL" | "FORECAST_READY" | "ACHIEVEMENT";

export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}): Promise<void> {
  await db.notification.create({
    data: { userId: params.userId, type: params.type, title: params.title, body: params.body, link: params.link },
  });
}

export async function maybeNotifyUsageThreshold(): Promise<void> { /* V2 */ }
