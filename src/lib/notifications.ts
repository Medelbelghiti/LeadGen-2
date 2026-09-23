import { db } from "./db";

export type NotificationType =
  | "SEARCH_COMPLETE"
  | "SEARCH_FAILED"
  | "USAGE_WARNING"
  | "USAGE_LIMIT"
  | "TRIAL_ENDING"
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILED"
  | "SUBSCRIPTION_CANCELED"
  | "REFERRAL_CONVERTED"
  | "AFFILIATE_PAYOUT"
  | "GENERAL";

export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}): Promise<void> {
  await db.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      link: params.link,
    },
  });
}

/** Create a usage-threshold notification once per period (80% / 100%). */
export async function maybeNotifyUsageThreshold(params: {
  userId: string;
  used: number;
  limit: number;
  periodKey: string;
  label: string;
}): Promise<void> {
  const { used, limit, userId, periodKey, label } = params;
  if (limit <= 0) return;
  const ratio = used / limit;
  const thresholds: Array<{ at: number; type: NotificationType; title: string }> = [
    { at: 1, type: "USAGE_LIMIT", title: `You've reached your monthly ${label} limit.` },
    { at: 0.8, type: "USAGE_WARNING", title: `You've used 80% of your monthly ${label}.` },
  ];
  for (const t of thresholds) {
    if (ratio >= t.at) {
      const already = await db.notification.findFirst({
        where: {
          userId,
          type: t.type,
          createdAt: { gte: periodStart(periodKey) },
          title: t.title,
        },
      });
      if (!already) {
        await createNotification({
          userId,
          type: t.type,
          title: t.title,
          body: "Upgrade your plan to continue without interruption.",
          link: "/settings/billing",
        });
      }
      break;
    }
  }
}

function periodStart(periodKey: string): Date {
  if (periodKey.startsWith("trial:")) return new Date(0);
  const [y, m] = periodKey.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, 1));
}
