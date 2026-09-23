import { db } from "@/lib/db";
import { runSearch } from "./orchestrator";
import { recordUsage, recordProviderUsage } from "@/lib/usage";
import { getEntitlements } from "@/lib/plans";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { createNotification } from "@/lib/notifications";
import { trackEvent } from "@/lib/analytics";
import { auditLog } from "@/lib/audit";
import type { NormalizedLead } from "./normalize";
import type { Search } from "@prisma/client";

export interface SearchJobInput {
  userId: string;
  niche: string;
  keywords?: string;
  location: string;
  countryCode?: string;
  countryName?: string;
  radiusKm?: number;
  latitude?: number;
  longitude?: number;
  maxResults: number;
  providers: string[];
  useDemo: boolean;
}

export interface SearchJobResult {
  searchId: string;
  status: "COMPLETED" | "FAILED" | "CANCELED";
  leadsCount: number;
  duplicatesRemoved: number;
  error?: string;
}

/**
 * Execute a search job:
 *   1. Validate entitlements (provider access, max results, monthly cap)
 *   2. Record SEARCH usage
 *   3. Create the Search row (status QUEUED → RUNNING)
 *   4. Run orchestrator with progress callback
 *   5. Persist leads + update Search status
 *   6. Record LEAD usage and ProviderUsage
 *   7. Emit notifications + analytics
 */
export async function runSearchJob(input: SearchJobInput): Promise<SearchJobResult> {
  const start = Date.now();
  const user = await db.user.findUnique({ where: { id: input.userId } });
  if (!user) return { searchId: "", status: "FAILED", leadsCount: 0, duplicatesRemoved: 0, error: "User not found" };

  const ent = await getEntitlements(user);
  const allowedProviders = ent.providers;
  const requestedProviders = (input.providers ?? []).filter((p) => allowedProviders.includes(p));
  const fallbackProviders = allowedProviders.filter((p) => !requestedProviders.includes(p));

  const flags = await Promise.all([
    isFeatureEnabled("demo_provider"),
    isFeatureEnabled("google_provider"),
    isFeatureEnabled("osm_provider"),
  ]);
  const providerEnabled: Record<string, boolean> = {
    demo: flags[0],
    google: flags[1],
    openstreetmap: flags[2],
  };

  const orderedProviders = [
    ...requestedProviders,
    ...fallbackProviders,
  ].filter((p) => providerEnabled[p] ?? true);
  if (input.useDemo && !orderedProviders.includes("demo")) orderedProviders.unshift("demo");
  const finalProviders = orderedProviders.length > 0 ? orderedProviders : ["demo"];

  const search = await db.search.create({
    data: {
      userId: user.id,
      niche: input.niche,
      keywords: input.keywords,
      countryCode: input.countryCode,
      countryName: input.countryName,
      location: input.location,
      latitude: input.latitude,
      longitude: input.longitude,
      radiusKm: input.radiusKm,
      maxResults: Math.min(input.maxResults, ent.maxResultsPerSearch),
      providers: JSON.stringify(finalProviders),
      status: "QUEUED",
      progress: 0,
      isDemo: input.useDemo,
    },
  });

  try {
    await recordUsage({
      userId: user.id,
      action: "SEARCH",
      planKey: ent.planKey,
      periodKey: ent.periodKey,
    });

    const searchLimit = Math.min(input.maxResults, ent.maxResultsPerSearch);
    if (input.maxResults > ent.maxResultsPerSearch) {
      await createNotification({
        userId: user.id,
        type: "GENERAL",
        title: `Results capped to ${searchLimit} per your plan`,
        body: `Your plan allows up to ${ent.maxResultsPerSearch} results per search.`,
        link: `/search/${search.id}`,
      });
    }

    await db.search.update({
      where: { id: search.id },
      data: { status: "RUNNING", progress: 5, progressMessage: "Starting…" },
    });
    await trackEvent("search_started", { userId: user.id, metadata: { niche: input.niche } });

    const result = await runSearch(
      {
        niche: input.niche,
        keywords: input.keywords,
        location: input.location,
        countryCode: input.countryCode,
        countryName: input.countryName,
        latitude: input.latitude,
        longitude: input.longitude,
        radiusKm: input.radiusKm,
        maxResults: searchLimit,
      },
      {
        searchId: search.id,
        providers: finalProviders,
        shouldCancel: async () => {
          const s = await db.search.findUnique({ where: { id: search.id }, select: { cancelRequested: true } });
          return Boolean(s?.cancelRequested);
        },
        onProgress: async (e) => {
          await db.search.update({
            where: { id: search.id },
            data: {
              progress: e.progress,
              progressMessage: e.message,
              providerStats: JSON.stringify(e.providerStats),
            },
          });
        },
      }
    );

    // Insert leads in batches
    let inserted = 0;
    const leadsForDb = result.leads.map((l) => leadToDb(user.id, search.id, l));
    const BATCH = 100;
    for (let i = 0; i < leadsForDb.length; i += BATCH) {
      if (await isCanceled(search.id)) break;
      const batch = leadsForDb.slice(i, i + BATCH);
      await db.lead.createMany({ data: batch });
      inserted += batch.length;
    }

    await db.search.update({
      where: { id: search.id },
      data: {
        status: (await isCanceled(search.id)) ? "CANCELED" : "COMPLETED",
        progress: 100,
        progressMessage: `Found ${inserted} leads (${result.duplicatesRemoved} duplicates removed).`,
        resultsCount: inserted,
        duplicatesRemoved: result.duplicatesRemoved,
        providerStats: JSON.stringify(result.providerStats),
        completedAt: new Date(),
        durationMs: Date.now() - start,
      },
    });

    if (inserted > 0) {
      await recordUsage({
        userId: user.id,
        action: "LEAD",
        quantity: inserted,
        searchId: search.id,
        planKey: ent.planKey,
        periodKey: ent.periodKey,
      });
      // Threshold notifications
      const monthly = await db.usageLedger.aggregate({
        where: { userId: user.id, action: "LEAD", periodKey: ent.periodKey },
        _sum: { quantity: true },
      });
      const used = monthly._sum.quantity ?? 0;
      if (ent.isTrial) {
        const { createNotification: notify } = await import("@/lib/notifications");
        const { maybeNotifyUsageThreshold } = await import("@/lib/notifications");
        await maybeNotifyUsageThreshold({
          userId: user.id,
          used,
          limit: ent.monthlyLeadLimit,
          periodKey: ent.periodKey,
          label: "leads",
        });
        void notify;
      }
    }

    for (const [prov, stat] of Object.entries(result.providerStats)) {
      if (stat.status === "SKIPPED") continue;
      await recordProviderUsage({
        provider: prov,
        userId: user.id,
        searchId: search.id,
        requests: 1,
        results: stat.results,
      });
    }

    await createNotification({
      userId: user.id,
      type: "SEARCH_COMPLETE",
      title: "Your search has completed",
      body: `${inserted} leads found in ${Math.round((Date.now() - start) / 1000)}s`,
      link: `/search/${search.id}`,
    });

    await trackEvent("search_completed", {
      userId: user.id,
      metadata: { leads: inserted, niche: input.niche },
    });
    await auditLog({
      userId: user.id,
      action: "search.completed",
      metadata: { searchId: search.id, leads: inserted },
    });

    return {
      searchId: search.id,
      status: (await isCanceled(search.id)) ? "CANCELED" : "COMPLETED",
      leadsCount: inserted,
      duplicatesRemoved: result.duplicatesRemoved,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.search.update({
      where: { id: search.id },
      data: { status: "FAILED", error: msg, progress: 100, completedAt: new Date() },
    });
    await createNotification({
      userId: user.id,
      type: "SEARCH_FAILED",
      title: "Search failed",
      body: msg,
      link: `/search/${search.id}`,
    });
    await auditLog({
      userId: user.id,
      action: "search.failed",
      metadata: { searchId: search.id, error: msg },
    });
    return { searchId: search.id, status: "FAILED", leadsCount: 0, duplicatesRemoved: 0, error: msg };
  }
}

export function leadToDb(userId: string, searchId: string, lead: NormalizedLead) {
  return {
    userId,
    searchId,
    businessName: lead.businessName,
    category: lead.category,
    subcategory: lead.subcategory,
    description: lead.description,
    phone: lead.phone,
    originalPhone: lead.originalPhone,
    internationalPhone: lead.internationalPhone,
    phoneVerified: lead.phoneVerified,
    email: lead.email,
    website: lead.website,
    domain: lead.domain,
    address: lead.address,
    street: lead.street,
    city: lead.city,
    region: lead.region,
    postalCode: lead.postalCode,
    country: lead.country,
    countryCode: lead.countryCode,
    latitude: lead.latitude,
    longitude: lead.longitude,
    rating: lead.rating,
    reviewCount: lead.reviewCount,
    openingHours: lead.openingHours,
    source: lead.source,
    sourceId: lead.sourceId,
    sourceUrl: lead.sourceUrl,
    isDemo: lead.isDemo,
    dataQualityScore:
      (lead as NormalizedLead & { dataQualityScore?: number }).dataQualityScore ?? 0,
  };
}

async function isCanceled(searchId: string): Promise<boolean> {
  const s = await db.search.findUnique({ where: { id: searchId }, select: { cancelRequested: true } });
  return Boolean(s?.cancelRequested);
}
