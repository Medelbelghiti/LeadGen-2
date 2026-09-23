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
 * for business search. Respects public usage policies (single geocode per search).
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
      freeQuotaPerMonth: 0, // community endpoints — respect usage policy
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
      const data = await this.overpass(query);
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
    const res = await fetch(url, {
      headers: { "User-Agent": "LeadGen-2.0/1.0 (https://leadgen.example)" },
    });
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

  private async overpass(query: string): Promise<OverpassResponse> {
    const res = await fetch(env.osmOverpassUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "LeadGen-2.0/1.0" },
      body: "data=" + encodeURIComponent(query),
    });
    if (!res.ok) throw new Error(`Overpass error: ${res.status}`);
    return (await res.json()) as OverpassResponse;
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
