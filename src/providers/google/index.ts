import type {
  BusinessDataProvider,
  BusinessSearchParams,
  BusinessSearchResult,
  ProviderCapabilities,
  RawBusiness,
} from "../types";
import { env } from "@/lib/env";

/**
 * Google Places (New) text-search provider. Requires an API key with the
 * Places API (New) enabled. When GOOGLE_PLACES_API_KEY is missing the provider
 * returns a FAILED status with a clear error — never fabricated data.
 */
export class GooglePlacesProvider implements BusinessDataProvider {
  getProviderName() {
    return "google";
  }
  getCapabilities(): ProviderCapabilities {
    return {
      search: true,
      requiresApiKey: true,
      global: true,
      freeQuotaPerMonth: 0,
    };
  }

  async searchBusinesses(params: BusinessSearchParams): Promise<BusinessSearchResult> {
    if (!env.googlePlacesApiKey) {
      return {
        provider: this.getProviderName(),
        results: [],
        status: "FAILED",
        error: "Google Places API key not configured (set GOOGLE_PLACES_API_KEY)",
        isDemo: false,
      };
    }
    try {
      const all: RawBusiness[] = [];
      let pageToken: string | undefined;
      const limit = Math.min(params.maxResults, 60);
      let pages = 0;
      while (all.length < limit && pages < 3) {
        const body: Record<string, unknown> = {
          textQuery: `${params.niche} in ${params.location}`,
          maxResultCount: Math.min(20, limit - all.length),
          languageCode: params.language ?? "en",
        };
        if (params.countryCode) body.regionCode = params.countryCode;
        if (pageToken) body.pageToken = pageToken;

        const res = await fetch(
          "https://places.googleapis.com/v1/places:searchText",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": env.googlePlacesApiKey,
              "X-Goog-FieldMask":
                "places.id,places.displayName,places.formattedAddress,places.internationalPhoneNumber,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.location,places.types",
            },
            body: JSON.stringify(body),
          }
        );
        if (!res.ok) throw new Error(`Google Places error: ${res.status}`);
        const data = (await res.json()) as GooglePlacesResponse;
        for (const p of data.places ?? []) all.push(this.toBusiness(p, params));
        pageToken = data.nextPageToken;
        if (!pageToken) break;
        pages++;
        await new Promise((r) => setTimeout(r, 1500));
      }
      return {
        provider: this.getProviderName(),
        results: all,
        status: all.length === 0 ? "EMPTY" : "OK",
        isDemo: false,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { provider: this.getProviderName(), results: [], status: "FAILED", error: msg, isDemo: false };
    }
  }

  private toBusiness(p: GooglePlace, params: BusinessSearchParams): RawBusiness {
    return {
      businessName: p.displayName?.text ?? "",
      category: p.types?.[0],
      phone: p.internationalPhoneNumber ?? p.nationalPhoneNumber,
      website: p.websiteUri,
      address: p.formattedAddress,
      countryCode: params.countryCode,
      latitude: p.location?.latitude,
      longitude: p.location?.longitude,
      rating: p.rating,
      reviewCount: p.userRatingCount,
      source: "google",
      sourceId: p.id,
      sourceUrl: p.websiteUri,
    };
  }
}

interface GooglePlacesResponse {
  places?: GooglePlace[];
  nextPageToken?: string;
}
interface GooglePlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  internationalPhoneNumber?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  location?: { latitude: number; longitude: number };
  types?: string[];
}
