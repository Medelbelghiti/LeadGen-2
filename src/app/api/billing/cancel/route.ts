import { NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling, parseJson, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { cancelSubscription } from "@/lib/stripe";
import { trackEvent } from "@/lib/analytics";

const Schema = z.object({ atPeriodEnd: z.boolean().optional().default(true) });

export const POST = withErrorHandling(async (req) => {
  const user = await requireUser();
  const parsed = await parseJson(req, Schema);
  const atPeriodEnd = parsed.atPeriodEnd ?? true;
  const res = await cancelSubscription({ atPeriodEnd });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
  await trackEvent("subscription_canceled", { userId: user.id });
  return ok({ ok: true });
});
