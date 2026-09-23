import { describe, it, expect } from "vitest";
import { normalize } from "@/services/normalize";

describe("normalize", () => {
  it("normalizes a raw record with E.164 phone", () => {
    const out = normalize(
      {
        businessName: "Café René",
        phone: "06 12 34 56 78",
        website: "https://www.Example.COM",
        email: "hi@example.com",
        address: "1 Demo St",
        city: "Paris",
        country: "France",
        countryCode: "FR",
        latitude: 48.85,
        longitude: 2.35,
        source: "openstreetmap",
        sourceId: "node/1",
      },
      false
    );
    expect(out.internationalPhone).toBe("+33612345678");
    expect(out.phoneVerified).toBe(true);
    expect(out.domain).toBe("example.com");
    expect(out.countryCode).toBe("FR");
    expect(out.businessName).toBe("Café René");
  });

  it("falls back gracefully on missing data", () => {
    const out = normalize(
      { businessName: "X", source: "demo", sourceId: "d1" },
      true
    );
    expect(out.internationalPhone).toBeNull();
    expect(out.phoneVerified).toBe(false);
    expect(out.domain).toBeNull();
    expect(out.isDemo).toBe(true);
  });
});
