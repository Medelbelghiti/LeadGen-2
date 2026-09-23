import { withErrorHandling, ok } from "@/lib/http";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { currentMonthKey } from "@/lib/utils";

export const GET = withErrorHandling(async () => {
  await requireAdmin();
  const period = currentMonthKey();

  const [
    usersCount,
    leadsCount,
    searchesCount,
    activeSubs,
    canceledSubs,
    trials,
    failedPayments,
    lifetimeSubs,
    pendingAffiliates,
    activeAffiliates,
    paidCentsAgg,
    recentInvoices,
    monthlyUsage,
  ] = await Promise.all([
    db.user.count({ where: { deletedAt: null } }),
    db.lead.count(),
    db.search.count(),
    db.subscription.count({ where: { status: { in: ["active", "trialing"] } } }),
    db.subscription.count({ where: { status: "canceled" } }),
    db.user.count({ where: { trialEndsAt: { gt: new Date() } } }),
    db.invoice.count({ where: { status: "open" } }),
    db.subscription.count({ where: { status: "lifetime" } }),
    db.affiliate.count({ where: { status: "PENDING" } }),
    db.affiliate.count({ where: { status: "APPROVED" } }),
    db.invoice.aggregate({ where: { status: "paid" }, _sum: { amountCents: true } }),
    db.invoice.findMany({ where: { status: "paid" }, orderBy: { createdAt: "desc" }, take: 8 }),
    db.usageLedger.groupBy({
      by: ["action"],
      where: { periodKey: period },
      _sum: { quantity: true },
    }),
  ]);

  return ok({
    usersCount,
    leadsCount,
    searchesCount,
    activeSubs,
    canceledSubs,
    trials,
    failedPayments,
    lifetimeSubs,
    pendingAffiliates,
    activeAffiliates,
    paidCents: paidCentsAgg._sum.amountCents ?? 0,
    monthlyUsage,
    recentInvoices,
  });
});
