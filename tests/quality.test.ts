import { describe, it, expect } from "vitest";
import { computeQuality } from "@/services/quality";
import type { NormalizedLead } from "@/services/normalize";

function lead(over: Partial<NormalizedLead> = {}): NormalizedLead {
  return {
    businessName: "Acme",
    category: null, subcategory: null, description: null,
    originalPhone: null, phone: null, internationalPhone: null, phoneVerified: false,
    email: null, website: null, domain: null,
    address: null, street: null, city: null, region: null, postalCode: null,
    country: null, countryCode: null,
    latitude: null, longitude: null,
    rating: null, reviewCount: null, openingHours: null,
    source: "demo", sourceId: "1", sourceUrl: null, isDemo: false,
    ...over,
  };
}

describe("computeQuality", () => {
  it("empty lead has low score", () => {
    const q = computeQuality(lead({ businessName: "" }));
    expect(q.score).toBe(5);
  });

  it("full lead scores 100", () => {
    const q = computeQuality(lead({
      internationalPhone: "+33612345678", phoneVerified: true,
      website: "https://acme.com", domain: "acme.com",
      address: "1 Rue", city: "Paris", country: "France", countryCode: "FR",
      latitude: 48, longitude: 2, email: "a@acme.com",
    }));
    expect(q.score).toBe(100);
    expect(q.missing).toEqual([]);
  });

  it("reports missing fields", () => {
    const q = computeQuality(lead({ businessName: "Acme" }));
    expect(q.missing).toContain("Phone");
    expect(q.missing).toContain("Website");
  });
});
