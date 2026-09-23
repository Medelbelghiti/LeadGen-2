/** Generic types shared by all business-data providers. */

export interface BusinessSearchParams {
  niche: string;
  keywords?: string;
  location: string;
  countryCode?: string;
  countryName?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  language?: string;
  maxResults: number;
}

export interface RawBusiness {
  businessName: string;
  category?: string;
  subcategory?: string;
  description?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  street?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  reviewCount?: number;
  openingHours?: string;
  source: string;
  sourceId: string;
  sourceUrl?: string;
}

export interface BusinessSearchResult {
  provider: string;
  results: RawBusiness[];
  /** Optional provider-reported status/error that doesn't fail the whole search. */
  status?: "OK" | "EMPTY" | "PARTIAL" | "FAILED";
  error?: string;
  /** Whether this provider returned synthetic/demo data (never mix with real). */
  isDemo: boolean;
}

export interface ProviderCapabilities {
  /** Provider can perform free-text search by niche + location. */
  search: boolean;
  /** Provider requires an API key to function. */
  requiresApiKey: boolean;
  /** Provider supports global coverage (true) or is region-restricted (false). */
  global: boolean;
  /** Approximate monthly free quota hint (0 means pay-per-use / requires plan). */
  freeQuotaPerMonth: number;
}

export interface BusinessDataProvider {
  searchBusinesses(params: BusinessSearchParams): Promise<BusinessSearchResult>;
  getProviderName(): string;
  getCapabilities(): ProviderCapabilities;
}
