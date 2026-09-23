import type {
  BusinessDataProvider,
  BusinessSearchParams,
  BusinessSearchResult,
  ProviderCapabilities,
  RawBusiness,
} from "../types";

/**
 * Deterministic Demo Provider.
 * Generates clearly-labeled synthetic data so any niche / any location works
 * without external API credentials. Demo records are never mixed with real records
 * (the orchestrator tags them with isDemo=true and the UI shows a banner).
 */
export class DemoProvider implements BusinessDataProvider {
  getProviderName() {
    return "demo";
  }
  getCapabilities(): ProviderCapabilities {
    return {
      search: true,
      requiresApiKey: false,
      global: true,
      freeQuotaPerMonth: Infinity,
    };
  }

  async searchBusinesses(params: BusinessSearchParams): Promise<BusinessSearchResult> {
    const seed = hashString(`${params.niche}|${params.location}|${params.countryCode ?? ""}`);
    const rng = mulberry32(seed);
    const count = Math.min(params.maxResults, 20);
    const results: RawBusiness[] = [];
    for (let i = 0; i < count; i++) {
      results.push(this.fakeBusiness(params, i, rng));
    }
    return { provider: this.getProviderName(), results, status: "OK", isDemo: true };
  }

  private fakeBusiness(
    params: BusinessSearchParams,
    i: number,
    rng: () => number
  ): RawBusiness {
    const nicheTitle = capitalize(params.niche);
    const cityName = params.location.split(",")[0].trim() || "City";
    const country = params.countryCode ?? "XX";
    const phoneCountry = mapIsoToDial(params.countryCode);
    const phoneNumber = `+${phoneCountry}${String(1000000 + Math.floor(rng() * 8999999)).slice(0, 8)}`;
    const domain = `example-${(i + 1).toString().padStart(3, "0")}.demo`;
    const name = `${nicheTitle} ${["Studio", "Group", "Hub", "Center", "Co", "Experts", "Lab", "Works"][i % 8]} ${cityName}`;
    return {
      businessName: name,
      category: params.niche,
      subcategory: params.keywords,
      description: `Synthetic ${params.niche} example for ${params.location} (DEMO DATA).`,
      phone: phoneNumber,
      email: `contact${i + 1}@${domain}`,
      website: `https://${domain}`,
      address: `${100 + i} Demo Street, ${cityName}`,
      city: cityName,
      country: params.countryName ?? country,
      countryCode: country,
      latitude: (params.latitude ?? 0) + (rng() - 0.5) * 0.05,
      longitude: (params.longitude ?? 0) + (rng() - 0.5) * 0.05,
      rating: Math.round((3 + rng() * 2) * 10) / 10,
      reviewCount: Math.floor(rng() * 200),
      source: "demo",
      sourceId: `demo-${hashString(name + i)}`,
      sourceUrl: undefined,
    };
  }
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed;
  return function () {
    t |= 0;
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function capitalize(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** Minimal ISO-3166 → dial code map (extend as needed; defaults to +1). */
const ISO_DIAL: Record<string, string> = {
  MA: "212", FR: "33", US: "1", CA: "1", GB: "44", ES: "34", PT: "351", DE: "49",
  IT: "39", NL: "31", BE: "32", CH: "41", AE: "971", SA: "966", QA: "974",
  EG: "20", TR: "90", IN: "91", PK: "92", CN: "86", JP: "81", KR: "82",
  SG: "65", MY: "60", ID: "62", AU: "61", NZ: "64", BR: "55", MX: "52",
  AR: "54", ZA: "27", NG: "234", KE: "254",
};
function mapIsoToDial(code?: string): string {
  return (code && ISO_DIAL[code.toUpperCase()]) || "1";
}
