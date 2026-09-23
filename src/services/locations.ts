import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { randomToken } from "@/lib/utils";

export interface LocationSuggestion {
  label: string;
  latitude: number;
  longitude: number;
  countryCode: string | null;
  country: string | null;
}

const cache = new Map<string, { at: number; data: LocationSuggestion[] }>();
const CACHE_TTL = 5 * 60 * 1000;
const cacheKey = (q: string) => `loc:${q.trim().toLowerCase()}`;

export async function suggestLocations(q: string, limit = 6): Promise<LocationSuggestion[]> {
  if (!q || q.trim().length < 2) return [];
  const key = cacheKey(q);
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && now - cached.at < CACHE_TTL) return cached.data.slice(0, limit);

  const dbRow = await db.auditLog.findFirst({
    where: { action: `loc:${q.toLowerCase()}` },
  });
  if (dbRow) {
    // Cache hit persisted via audit row? Use TTL cache only — drop DB lookup for perf.
    void dbRow;
  }

  const url = `${env.osmNominatimUrl}/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=${limit}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "LeadGen-2.0/1.0 (https://leadgen.example)" },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as NominatimResult[];
    const suggestions: LocationSuggestion[] = data.map((r) => ({
      label: [r.address?.city, r.address?.town, r.address?.village, r.address?.state, r.address?.country]
        .filter(Boolean)
        .join(", "),
      latitude: Number(r.lat),
      longitude: Number(r.lon),
      countryCode: r.address?.country_code?.toUpperCase() ?? null,
      country: r.address?.country ?? null,
    }));
    cache.set(key, { at: now, data: suggestions });
    return suggestions;
  } catch {
    return [];
  }
}

interface NominatimResult {
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
}

void randomToken; // keep helper import alive for tree-shake guard
