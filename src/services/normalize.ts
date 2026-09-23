import { normalizePhone, domainFromUrl } from "@/lib/phone";
import type { RawBusiness } from "@/providers";

export interface NormalizedLead {
  businessName: string;
  category: string | null;
  subcategory: string | null;
  description: string | null;
  originalPhone: string | null;
  phone: string | null;
  internationalPhone: string | null;
  phoneVerified: boolean;
  email: string | null;
  website: string | null;
  domain: string | null;
  address: string | null;
  street: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
  countryCode: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  reviewCount: number | null;
  openingHours: string | null;
  source: string;
  sourceId: string | null;
  sourceUrl: string | null;
  isDemo: boolean;
}

/** Normalize a raw provider record into a uniform internal shape. */
export function normalize(raw: RawBusiness, isDemo: boolean): NormalizedLead {
  const phoneInfo = normalizePhone(raw.phone ?? null, raw.countryCode ?? undefined);
  const domain = domainFromUrl(raw.website ?? null);
  return {
    businessName: raw.businessName?.trim() || "Unknown business",
    category: raw.category ?? null,
    subcategory: raw.subcategory ?? null,
    description: raw.description ?? null,
    originalPhone: raw.phone ?? null,
    phone: phoneInfo.e164,
    internationalPhone: phoneInfo.e164,
    phoneVerified: phoneInfo.valid,
    email: raw.email ?? null,
    website: raw.website ?? null,
    domain,
    address: raw.address ?? null,
    street: raw.street ?? null,
    city: raw.city ?? null,
    region: raw.region ?? null,
    postalCode: raw.postalCode ?? null,
    country: raw.country ?? null,
    countryCode: raw.countryCode ?? null,
    latitude: typeof raw.latitude === "number" ? raw.latitude : null,
    longitude: typeof raw.longitude === "number" ? raw.longitude : null,
    rating: typeof raw.rating === "number" ? raw.rating : null,
    reviewCount: typeof raw.reviewCount === "number" ? raw.reviewCount : null,
    openingHours: raw.openingHours ?? null,
    source: raw.source,
    sourceId: raw.sourceId ?? null,
    sourceUrl: raw.sourceUrl ?? null,
    isDemo,
  };
}
