import { describe, it, expect } from "vitest";
import { deduplicate, similarity, haversineKm } from "@/services/dedupe";
import type { NormalizedLead } from "@/services/normalize";

function L(over: Partial<NormalizedLead> & { businessName: string; source: string; sourceId?: string | null; phone?: string | null; domain?: string | null; latitude?: number | null; longitude?: number | null; address?: string | null; city?: string | null }): NormalizedLead {
  return {
    category: null, subcategory: null, description: null,
    originalPhone: null, internationalPhone: over.phone ?? null, phoneVerified: false,
    email: null, website: null, country: null, countryCode: null,
    region: null, postalCode: null, street: null, rating: null, reviewCount: null, openingHours: null,
    sourceUrl: null, isDemo: false,
    sourceId: over.sourceId ?? null,
    ...over,
  } as NormalizedLead;
}

describe("similarity", () => {
  it("phone match is perfect", () => {
    const a = L({ businessName: "Acme Co", source: "google", phone: "+33612345678" });
    const b = L({ businessName: "Different Name", source: "osm", phone: "+33612345678" });
    expect(similarity(a, b)).toBe(1);
  });
  it("domain match is perfect", () => {
    const a = L({ businessName: "Acme Co", source: "google", domain: "acme.com" });
    const b = L({ businessName: "Acme SARL", source: "osm", domain: "acme.com" });
    expect(similarity(a, b)).toBeGreaterThan(0.8);
  });
  it("name similarity alone does not exceed threshold", () => {
    const a = L({ businessName: "Pizzeria Bella Roma", source: "google" });
    const b = L({ businessName: "Pizzeria Bella Roma", source: "osm" });
    const s = similarity(a, b);
    expect(s).toBeLessThan(0.8);
  });
  it("close coordinates + matching city increases score", () => {
    const a = L({ businessName: "X", source: "google", latitude: 48.85, longitude: 2.35, city: "Paris", address: "1 Rue" });
    const b = L({ businessName: "Y", source: "osm", latitude: 48.8501, longitude: 2.3501, city: "Paris", address: "1 Rue" });
    expect(similarity(a, b)).toBeGreaterThan(0.8);
  });
});

describe("deduplicate", () => {
  it("merges same phone, keeps best data", () => {
    const r = deduplicate([
      L({ businessName: "Acme", source: "google", phone: "+33612345678" }),
      L({ businessName: "Acme SARL", source: "osm", phone: "+33612345678", email: "a@acme.com", website: "https://acme.com", domain: "acme.com" }),
    ]);
    expect(r.duplicatesRemoved).toBe(1);
    expect(r.leads).toHaveLength(1);
    expect(r.leads[0].email).toBe("a@acme.com");
    expect(r.leads[0].website).toBe("https://acme.com");
  });

  it("does not merge distinct businesses", () => {
    const r = deduplicate([
      L({ businessName: "Pizzeria Roma", source: "google", phone: "+33111111111" }),
      L({ businessName: "Sushi Bar", source: "osm", phone: "+33222222222" }),
    ]);
    expect(r.leads).toHaveLength(2);
    expect(r.duplicatesRemoved).toBe(0);
  });
});

describe("haversineKm", () => {
  it("Paris to London ≈ 343 km", () => {
    const d = haversineKm(48.8566, 2.3522, 51.5074, -0.1278);
    expect(d).toBeGreaterThan(330);
    expect(d).toBeLessThan(360);
  });
  it("same point is 0 km", () => {
    expect(haversineKm(48, 2, 48, 2)).toBeCloseTo(0, 5);
  });
});
