import { NextResponse } from "next/server";
import { withErrorHandling, parseJson, ok } from "@/lib/http";
import { SearchRequestSchema } from "@/lib/schemas";
import { requireUser } from "@/lib/auth";
import { getEntitlements, LimitReachedError } from "@/lib/plans";
import { getUsageCount } from "@/lib/usage";
import { getDailySearchCount } from "@/lib/usage";
import { runSearchJob } from "@/services/search-job";
import { listProviders } from "@/providers";
import { auditLog } from "@/lib/audit";

export const GET = withErrorHandling(async () => {
  const providers = listProviders().map((p) => ({
    name: p.getProviderName(),
    capabilities: p.getCapabilities(),
  }));
  return ok({ providers });
});

export const POST = withErrorHandling(async (req) => {
  const user = await requireUser();
  const body = await parseJson(req, SearchRequestSchema);

  const ent = await getEntitlements(user);

  // Enforce daily + monthly search limits
  const daily = await getDailySearchCount(user.id);
  if (daily >= ent.dailySearchLimit) {
    throw new LimitReachedError("searches", "Daily search limit reached");
  }
  if (!ent.isTrial) {
    const monthly = await getUsageCount(user.id, "SEARCH", ent.periodKey);
    if (monthly >= ent.monthlySearchLimit) {
      throw new LimitReachedError("searches", "Monthly search limit reached");
    }
  }

  // Enforce monthly lead limit pre-check
  const leadUsage = await getUsageCount(user.id, "LEAD", ent.periodKey);
  const requested = body.maxResults ?? 25;
  const maxAllowed = Math.max(0, ent.monthlyLeadLimit - leadUsage);
  if (maxAllowed <= 0) {
    throw new LimitReachedError("leads", "You've reached your monthly lead limit");
  }

  const allowedProviders = ent.providers;
  const requestedProviders = (body.providers ?? []).filter((p) => allowedProviders.includes(p));
  const finalProviders = requestedProviders.length > 0 ? requestedProviders : allowedProviders;

  // Run synchronously (route handler) so users see results immediately for small jobs;
  // the job runner updates the Search row and the client polls progress.
  const job = await runSearchJob({
    userId: user.id,
    niche: body.niche,
    keywords: body.keywords,
    location: body.location,
    countryCode: body.countryCode,
    countryName: body.countryName,
    radiusKm: body.radiusKm,
    latitude: body.latitude,
    longitude: body.longitude,
    maxResults: Math.min(requested, maxAllowed, ent.maxResultsPerSearch),
    providers: finalProviders,
    useDemo: Boolean(body.useDemo),
  });

  await auditLog({
    userId: user.id,
    action: "search.created",
    metadata: { searchId: job.searchId, leads: job.leadsCount },
  });

  return ok(job);
});
