import { withErrorHandling, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { getEntitlements } from "@/lib/plans";
import { getMonthlyUsage } from "@/lib/usage";

export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  const ent = await getEntitlements(user);
  const usage = await getMonthlyUsage(user.id, ent.periodKey);
  return ok({
    planKey: ent.planKey,
    planName: ent.planName,
    subscriptionStatus: ent.subscriptionStatus,
    isTrial: ent.isTrial,
    trialEndsAt: ent.trialEndsAt,
    currentPeriodEnd: ent.currentPeriodEnd,
    isLifetime: ent.isLifetime,
    limits: {
      monthlyLeads: ent.monthlyLeadLimit,
      monthlySearches: ent.monthlySearchLimit,
      dailySearches: ent.dailySearchLimit,
      exports: ent.exportLimit,
      maxResultsPerSearch: ent.maxResultsPerSearch,
    },
    usage,
    periodKey: ent.periodKey,
  });
});
