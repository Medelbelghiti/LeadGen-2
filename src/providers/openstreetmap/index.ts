import type {
  BusinessDataProvider,
  BusinessSearchParams,
  BusinessSearchResult,
  ProviderCapabilities,
  RawBusiness,
} from "../types";
import { env } from "@/lib/env";
import { osmTagsForNiche } from "@/lib/osm-tags";

/**
 * OpenStreetMap provider. Uses Nominatim for geocoding and the Overpass API
 * for business search. Respects public usage policies:
 *   - one geocode per search
 *   - one Overpass query per search
 *   - automatic retry + fallback endpoint on transient failures
 *   - per-query timeout to avoid hanging the search job
 */
export class OpenStreetMapProvider implements BusinessDataProvider {
  getProviderName() {
    return "openstreetmap";
  }
  getCapabilities(): ProviderCapabilities {
    return {
      search: true,
      requiresApiKey: false,
      global: true,
      freeQuotaPerMonth: 0,
    };
  }

  async searchBusinesses(params: BusinessSearchParams): Promise<BusinessSearchResult> {
    try {
      const geo = await this.geocode(params);
      if (!geo) return { provider: this.getProviderName(), results: [], status: "EMPTY", isDemo: false };

      const bbox = geo.boundingbox ?? null;
      const bboxStr = bbox
        ? `${bbox[0]},${bbox[2]},${bbox[1]},${bbox[3]}`
        : `${Number(geo.lat) - 0.5},${Number(geo.lon) - 0.5},${Number(geo.lat) + 0.5},${Number(geo.lon) + 0.5}`;

      const query = this.buildOverpassQuery(params, bboxStr);
      const data = await this.overpassWithFallback(query);
      const elements = (data.elements ?? []) as OverpassElement[];
      const limit = params.maxResults;
      const results: RawBusiness[] = [];
      for (const el of elements) {
        if (results.length >= limit) break;
        const biz = this.toBusiness(el, params);
        if (biz) results.push(biz);
      }
      return {
        provider: this.getProviderName(),
        results,
        status: results.length === 0 ? "EMPTY" : "OK",
        isDemo: false,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { provider: this.getProviderName(), results: [], status: "FAILED", error: msg, isDemo: false };
    }
  }

  private async geocode(p: BusinessSearchParams): Promise<GeocodeResult | null> {
    const q = encodeURIComponent(`${p.location}${p.countryCode ? ", " + p.countryCode : ""}`);
    const url = `${env.osmNominatimUrl}/search?q=${q}&format=json&limit=1&addressdetails=1`;
    const res = await this.fetchWithTimeout(url, {
      headers: { "User-Agent": "LeadGen-2.0/1.0 (https://leadgen.example)" },
    }, 10_000);
    if (!res.ok) throw new Error(`Nominatim error: ${res.status}`);
    const data = (await res.json()) as GeocodeResult[];
    return data[0] ?? null;
  }

  private buildOverpassQuery(p: BusinessSearchParams, bbox: string): string {
    const tags = osmTagsForNiche(p.niche);
    const nicheEsc = p.niche.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const filters: string[] = [];

    if (tags.length > 0) {
      const tagFilters = tags.map((t) => {
        const [k, v] = t.split("=");
        return `["${k}"="${v}"]`;
      });
      filters.push(`(\n  ${tagFilters.join("\n  ")}\n);`);
    }

    filters.push(`node["name"~"${nicheEsc}",i](${bbox});`);
    filters.push(`way["name"~"${nicheEsc}",i](${bbox});`);

    return `[out:json][timeout:25];(\n${filters.join("\n")}\n);out center ${p.maxResults + 50};`;
  }

  /**
   * Tries the configured Overpass endpoint, then falls back to known mirrors
   * if the first attempt returns 504/timeout/network errors. Retries once
   * per endpoint with a short backoff.
   */
  private async overpassWithFallback(query: string): Promise<OverpassResponse> {
    const endpoints = this.overpassEndpoints();
    let lastError: string | null = null;
    for (const url of endpoints) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const res = await this.fetchWithTimeout(
            url,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "LeadGen-2.0/1.0",
              },
              body: "data=" + encodeURIComponent(query),
            },
            30_000
          );
          if (res.ok) return (await res.json()) as OverpassResponse;
          lastError = `Overpass ${res.status} from ${this.hostOf(url)}`;
          // 4xx other than 429 are unlikely to recover — skip to next endpoint
          if (res.status >= 400 && res.status < 500 && res.status !== 429) break;
        } catch (e) {
          lastError = e instanceof Error ? e.message : String(e);
        }
        await sleep(800 * attempt);
      }
    }
    throw new Error(lastError ?? "Overpass: all endpoints failed");
  }

  private overpassEndpoints(): string[] {
    const primary = env.osmOverpassUrl.replace(/\/+$/, "");
    const mirrors = [
      primary,
      "https://overpass.kumi.systems/api/interpreter",
      "https://overpass.private.coffee/api/interpreter",
    ];
    // de-duplicate while preserving order
    return Array.from(new Set(mirrors));
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  private hostOf(url: string): string {
    try {
      return new URL(url).host;
    } catch {
      return url;
    }
  }

  private toBusiness(el: OverpassElement, p: BusinessSearchParams): RawBusiness | null {
    const tags = el.tags ?? {};
    const name = tags.name ?? tags["name:en"];
    if (!name) return null;
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    const phoneRaw = tags.phone ?? tags["contact:phone"];
    const website = tags.website ?? tags["contact:website"];
    const address = composeAddress(tags);
    return {
      businessName: name,
      category: tags.amenity ?? tags.shop ?? tags.office ?? tags.tourism ?? tags.craft ?? p.niche,
      description: tags.description,
      phone: phoneRaw,
      website,
      email: tags.email ?? tags["contact:email"],
      address,
      street: tags["addr:street"],
      city: tags["addr:city"] ?? p.location.split(",")[0].trim(),
      region: tags["addr:state"] ?? tags["addr:region"],
      postalCode: tags["addr:postcode"],
      country: tags["addr:country"],
      countryCode: p.countryCode,
      latitude: lat,
      longitude: lon,
      openingHours: tags.opening_hours,
      source: "openstreetmap",
      sourceId: `${el.type}/${el.id}`,
      sourceUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
    };
  }
}

function composeAddress(tags: Record<string, string>): string {
  const parts = [
    [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" "),
    tags["addr:suburb"],
    tags["addr:city"],
    tags["addr:postcode"],
    tags["addr:country"],
  ].filter(Boolean);
  return parts.join(", ") || "";
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

interface GeocodeResult {
  lat: string;
  lon: string;
  boundingbox?: [string, string, string, string];
}
interface OverpassResponse {
  elements: OverpassElement[];
}
interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}
