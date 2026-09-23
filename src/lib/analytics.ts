import { db } from "./db";

/**
 * Analytics abstraction. Events are stored internally by default.
 * To forward to an external analytics vendor, implement `forwardEvent`
 * — never send lead data or PII to analytics systems.
 */
export type AnalyticsEventName =
  | "signup"
  | "trial_started"
  | "search_started"
  | "search_completed"
  | "export_created"
  | "checkout_started"
  | "subscription_created"
  | "subscription_canceled"
  | "referral_signup"
  | "login";

export async function trackEvent(
  event: AnalyticsEventName,
  params: { userId?: string; metadata?: Record<string, unknown> } = {}
): Promise<void> {
  const safeMetadata = sanitizeMetadata(params.metadata ?? {});
  await db.analyticsEvent.create({
    data: {
      userId: params.userId,
      event,
      metadata: JSON.stringify(safeMetadata),
    },
  });
  await forwardEvent(event, params.userId, safeMetadata);
}

/** Strip anything that could contain lead data or PII. */
function sanitizeMetadata(meta: Record<string, unknown>): Record<string, unknown> {
  const blocked = ["email", "name", "phone", "lead", "leads", "address", "website"];
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (blocked.some((b) => k.toLowerCase().includes(b))) continue;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") out[k] = v;
  }
  return out;
}

async function forwardEvent(
  _event: string,
  _userId: string | undefined,
  _metadata: Record<string, unknown>
): Promise<void> {
  // External analytics forwarding intentionally not configured by default.
  // Add a vendor here behind an env flag if needed.
}
