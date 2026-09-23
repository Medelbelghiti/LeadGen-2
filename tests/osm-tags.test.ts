import { describe, it, expect } from "vitest";
import { osmTagsForNiche } from "@/lib/osm-tags";

describe("osmTagsForNiche", () => {
  it("returns tags for known niches", () => {
    expect(osmTagsForNiche("Dentists")).toContain("amenity=dentist");
    expect(osmTagsForNiche("Restaurants")).toContain("amenity=restaurant");
  });
  it("returns empty for unknown niche (orchestrator falls back to name-regex)", () => {
    expect(osmTagsForNiche("Quantum entanglement consultants")).toEqual([]);
  });
  it("is case-insensitive", () => {
    expect(osmTagsForNiche("DENTIST")).toContain("amenity=dentist");
  });
  it("partial match works", () => {
    expect(osmTagsForNiche("real estate agencies")).toContain("office=estate_agent");
  });
});
