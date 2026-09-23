import { describe, it, expect } from "vitest";
import { toCsv, toJson } from "@/services/export";

describe("toCsv", () => {
  it("escapes quotes and commas", () => {
    const csv = toCsv([
      {
        businessName: `Smith, "Bob" & Co.`,
        category: null, subcategory: null, description: null,
        phone: null, internationalPhone: null, email: null, website: null, domain: null,
        address: null, street: null, city: null, region: null, postalCode: null, country: null,
        latitude: null, longitude: null, rating: null, reviewCount: null,
        source: "demo", sourceUrl: null, dataQualityScore: 50,
        status: "NEW", tags: ["a", "b"], notes: "line1\nline2",
        collectedAt: new Date("2026-01-01T00:00:00Z"),
      },
    ]);
    expect(csv).toContain(`"Smith, ""Bob"" & Co."`);
    expect(csv).toContain('"line1\nline2"');
    expect(csv.split("\n")[0].split(",")[0]).toBe("Business Name");
  });
});

describe("toJson", () => {
  it("returns a JSON array", () => {
    const j = JSON.parse(toJson([
      {
        businessName: "X",
        category: null, subcategory: null, description: null,
        phone: null, internationalPhone: null, email: null, website: null, domain: null,
        address: null, street: null, city: null, region: null, postalCode: null, country: null,
        latitude: null, longitude: null, rating: null, reviewCount: null,
        source: "demo", sourceUrl: null, dataQualityScore: 50,
        status: "NEW", tags: [], notes: null,
        collectedAt: new Date("2026-01-01T00:00:00Z"),
      },
    ]));
    expect(Array.isArray(j)).toBe(true);
    expect(j[0]["Business Name"]).toBe("X");
  });
});
