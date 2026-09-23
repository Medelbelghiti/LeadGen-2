import { withErrorHandling, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripeConfigured } from "@/lib/env";
import { currentMonthKey } from "@/lib/utils";

export const GET = withErrorHandling(async () => {
  await requireAdmin();
  const period = currentMonthKey();

  // DB
  let dbStatus: "OK" | "ERR" = "OK";
  try {
    await db.user.count();
  } catch {
    dbStatus = "ERR";
  }

  // Stripe
  const stripeStatus = stripeConfigured() ? "OK" : "WARNING";

  // Email — console is always available
  const emailStatus = "OK";

  // Queue / providers — derive from recent ProviderUsage rows
  const recent = await db.providerUsage.findMany({
    where: { periodKey: period },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const byProvider = recent.reduce<Record<string, { requests: number; results: number; errors: number }>>(
    (acc, r) => {
      acc[r.provider] = acc[r.provider] ?? { requests: 0, results: 0, errors: 0 };
      acc[r.provider].requests += r.requests;
      acc[r.provider].results += r.results;
      if (r.estimatedCostCents < 0) acc[r.provider].errors += 1;
      return acc;
    },
    {}
  );

  return ok({
    database: dbStatus,
    stripe: stripeStatus,
    email: emailStatus,
    providers: byProvider,
    lastChecked: new Date().toISOString(),
  });
});
