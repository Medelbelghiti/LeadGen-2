import type { BusinessDataProvider, BusinessSearchParams, BusinessSearchResult } from "@/providers";
import { getProvider } from "@/providers";
import { normalize, type NormalizedLead } from "./normalize";
import { deduplicate } from "./dedupe";
import { computeQuality } from "./quality";

export interface ProgressEvent {
  searchId: string;
  progress: number;
  message: string;
  providerStats: Record<string, ProviderStat>;
}

export interface ProviderStat {
  requested: number;
  results: number;
  status: "OK" | "EMPTY" | "FAILED" | "SKIPPED";
  error?: string;
}

export interface OrchestratorOptions {
  searchId: string;
  providers: string[]; // ordered by priority
  onProgress?: (e: ProgressEvent) => Promise<void> | void;
  shouldCancel?: () => Promise<boolean>;
}

/**
 * ProviderOrchestrator
 *   1. execute providers in priority order (switch to fallback on FAILED/EMPTY)
 *   2. normalize results per provider
 *   3. deduplicate across providers (using strong + supporting signals)
 *   4. score data quality
 *   5. report progress between steps
 */
export async function runSearch(
  params: BusinessSearchParams,
  opts: OrchestratorOptions
): Promise<{ leads: NormalizedLead[]; providerStats: Record<string, ProviderStat>; duplicatesRemoved: number }> {
  const stats: Record<string, ProviderStat> = {};
  const allLeads: NormalizedLead[] = [];

  let attemptedAtLeastOne = false;

  for (const key of opts.providers) {
    if (opts.shouldCancel && (await opts.shouldCancel())) {
      stats[key] = { requested: 0, results: 0, status: "SKIPPED", error: "Canceled" };
      break;
    }
    const provider = getProvider(key);
    if (!provider) {
      stats[key] = { requested: 0, results: 0, status: "SKIPPED", error: "Unknown provider" };
      continue;
    }
    if (provider.getCapabilities().requiresApiKey && !process.env.GOOGLE_PLACES_API_KEY) {
      stats[key] = { requested: 0, results: 0, status: "SKIPPED", error: "API key not configured" };
      continue;
    }

    attemptedAtLeastOne = true;
    await opts.onProgress?.({
      searchId: opts.searchId,
      progress: Math.min(95, Math.round((Object.keys(stats).length / opts.providers.length) * 80)),
      message: `Querying ${provider.getProviderName()}…`,
      providerStats: stats,
    });

    let res: BusinessSearchResult;
    try {
      res = await provider.searchBusinesses({ ...params, maxResults: params.maxResults });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      res = { provider: key, results: [], status: "FAILED", error: msg, isDemo: false };
    }
    stats[key] = {
      requested: params.maxResults,
      results: res.results.length,
      status: res.status === "OK" ? "OK" : res.status === "EMPTY" ? "EMPTY" : "FAILED",
      error: res.error,
    };

    if (res.status !== "FAILED" && res.results.length > 0) {
      for (const raw of res.results) allLeads.push(normalize(raw, res.isDemo));
    }
  }

  await opts.onProgress?.({
    searchId: opts.searchId,
    progress: 90,
    message: "Normalizing and deduplicating…",
    providerStats: stats,
  });

  const { leads: deduped, duplicatesRemoved } = deduplicate(allLeads);

  for (const lead of deduped) {
    const q = computeQuality(lead);
    (lead as NormalizedLead & { dataQualityScore: number; missing: string[] }).dataQualityScore = q.score;
    (lead as NormalizedLead & { dataQualityScore: number; missing: string[] }).missing = q.missing;
  }

  // Cap to requested maxResults
  const trimmed = deduped.slice(0, params.maxResults);

  if (!attemptedAtLeastOne && opts.providers.length > 0) {
    await opts.onProgress?.({
      searchId: opts.searchId,
      progress: 100,
      message: "No providers executed (all skipped).",
      providerStats: stats,
    });
  }

  return { leads: trimmed, providerStats: stats, duplicatesRemoved };
}
