import { describe, it, expect } from "vitest";
import { DemoProvider } from "@/providers/demo";

describe("DemoProvider", () => {
  const p = new DemoProvider();
  it("is global and requires no API key", () => {
    const c = p.getCapabilities();
    expect(c.global).toBe(true);
    expect(c.requiresApiKey).toBe(false);
  });
  it("returns deterministic results for the same query", async () => {
    const a = await p.searchBusinesses({
      niche: "Solar installers",
      location: "Marrakech",
      countryCode: "MA",
      maxResults: 10,
    });
    const b = await p.searchBusinesses({
      niche: "Solar installers",
      location: "Marrakech",
      countryCode: "MA",
      maxResults: 10,
    });
    expect(a.results.map((r) => r.businessName)).toEqual(b.results.map((r) => r.businessName));
  });
  it("labels results as demo", async () => {
    const r = await p.searchBusinesses({
      niche: "Coworking spaces",
      location: "Berlin",
      countryCode: "DE",
      maxResults: 5,
    });
    expect(r.isDemo).toBe(true);
    expect(r.results.length).toBe(5);
    expect(r.results.every((x) => x.source === "demo")).toBe(true);
  });
  it("never exceeds maxResults", async () => {
    const r = await p.searchBusinesses({
      niche: "Dentists",
      location: "Casablanca",
      countryCode: "MA",
      maxResults: 3,
    });
    expect(r.results.length).toBe(3);
  });
});
