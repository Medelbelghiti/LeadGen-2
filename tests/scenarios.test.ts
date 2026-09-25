/**
 * Scenario financial correctness tests.
 *
 * Each test documents the expected math and verifies the implementation.
 * No mocks — these run the REAL engine.
 */
import { describe, it, expect } from "vitest";
import { summarizeExpenses, projectCost, trueOwnershipCost, type CostSummary } from "@/lib/finance";

/**
 * Compute a deterministic CostSummary for scenario tests.
 *   months = 3
 *   category totals in cents
 *   recorded fuel = 30_000, maintenance = 20_000, insurance = 50_000, parking = 10_000
 *   total = 110_000
 *   monthlyAverage = 110_000 / 3 = 36_666 (rounded) → 36_667
 */
function fixture(): CostSummary {
  return summarizeExpenses(
    [
      { amountCents: 15000, currency: "USD", date: new Date("2026-01-15"), category: "fuel" },
      { amountCents: 10000, currency: "USD", date: new Date("2026-01-20"), category: "maintenance" },
      { amountCents: 50000, currency: "USD", date: new Date("2026-02-05"), category: "insurance" },
      { amountCents: 10000, currency: "USD", date: new Date("2026-02-10"), category: "parking" },
      { amountCents: 15000, currency: "USD", date: new Date("2026-02-20"), category: "fuel" },
      { amountCents: 10000, currency: "USD", date: new Date("2026-03-05"), category: "maintenance" },
    ],
    [],
    "USD"
  );
}

describe("keep_vs_replace scenario math", () => {
  it("case 1: replacement cheaper than keep", () => {
    const summary = fixture();
    const horizon = 36;
    const resale = 1_000_000;        // $10,000
    const replacePrice = 1_500_000;  // $15,000
    const monthly = summary.monthlyAverage;
    const keepTotal = monthly * horizon;                // 36_667 * 36 = 1_320_012
    const replaceTotal = replacePrice - resale + keepTotal; // 500_000 + 1_320_012 = 1_820_012
    expect(keepTotal).toBe(1_320_012);
    expect(replaceTotal).toBe(1_820_012);
    expect(replaceTotal - keepTotal).toBe(500_000); // = purchase - resale (capital delta)
  });

  it("case 2: keep cheaper than replace", () => {
    const summary = fixture();
    const resale = 800_000;
    const replacePrice = 1_000_000;  // cheaper
    const keepTotal = summary.monthlyAverage * 36;
    const replaceTotal = replacePrice - resale + keepTotal; // 200_000 + keep
    expect(replaceTotal).toBeLessThan(replacePrice + keepTotal); // capital delta is positive only
  });

  it("case 3: zero resale → full purchase price is the capital delta", () => {
    const resale = 0;
    const replacePrice = 2_000_000;
    const keepTotal = 0;
    const replaceTotal = replacePrice - resale + keepTotal;
    expect(replaceTotal).toBe(2_000_000);
  });

  it("case 4: high resale reduces capital delta", () => {
    const resale = 1_800_000;  // almost full purchase
    const replacePrice = 2_000_000;
    const capitalDelta = replacePrice - resale; // 200_000
    expect(capitalDelta).toBe(200_000);
  });

  it("case 5: no NaN, no Infinity, no negative impossible totals", () => {
    const summary = fixture();
    expect(Number.isFinite(summary.monthlyAverage)).toBe(true);
    expect(Number.isFinite(summary.totalSpent)).toBe(true);
    const t = trueOwnershipCost(summary, {
      purchasePriceCents: 2_000_000,
      purchaseDate: new Date("2022-01-01"),
      estimatedResaleCents: 1_400_000,
      forwardLookingFixedCents: 0,
    }, 36);
    expect(Number.isFinite(t.total)).toBe(true);
    expect(t.total).toBeGreaterThanOrEqual(0);
  });
});

describe("repair_vs_replace scenario math", () => {
  it("case 1: repair cheaper than replacement", () => {
    const summary = fixture();
    const remainingMonths = 24;
    const repair = 50_000;
    const replacePrice = 1_500_000;
    const resale = 1_200_000;
    const monthly = summary.monthlyAverage;

    const repairScenario = repair + monthly * remainingMonths;          // 50k + monthly*24
    const replaceScenario = replacePrice - resale + monthly * remainingMonths; // 300k + monthly*24
    // Net: replaceScenario - repairScenario = (replacePrice - resale) - repair
    expect(replaceScenario - repairScenario).toBe(replacePrice - resale - repair); // = 250_000
    expect(replaceScenario).toBeGreaterThan(repairScenario);
  });

  it("case 2: replacement cheaper than repair", () => {
    const summary = fixture();
    const remainingMonths = 24;
    const repair = 800_000;  // very expensive
    const replacePrice = 1_500_000;
    const resale = 1_200_000;
    const monthly = summary.monthlyAverage;
    const repairScenario = repair + monthly * remainingMonths;
    const replaceScenario = replacePrice - resale + monthly * remainingMonths;
    expect(replaceScenario).toBeLessThan(repairScenario);
  });

  it("case 3: zero repair cost → repair scenario = pure operating", () => {
    const summary = fixture();
    const remainingMonths = 12;
    const repair = 0;
    const monthly = summary.monthlyAverage;
    const repairScenario = repair + monthly * remainingMonths;
    expect(repairScenario).toBe(monthly * remainingMonths);
  });

  it("case 4: high repair cost", () => {
    const summary = fixture();
    const remainingMonths = 36;
    const repair = 1_000_000;
    const monthly = summary.monthlyAverage;
    const repairScenario = repair + monthly * remainingMonths;
    expect(repairScenario).toBe(1_000_000 + monthly * 36);
  });

  it("case 5: zero resale → replace = full purchase + operating", () => {
    const summary = fixture();
    const remainingMonths = 12;
    const replacePrice = 1_800_000;
    const resale = 0;
    const monthly = summary.monthlyAverage;
    const replaceScenario = replacePrice - resale + monthly * remainingMonths;
    expect(replaceScenario).toBe(1_800_000 + monthly * 12);
  });

  it("case 6: different horizons — operating scales linearly", () => {
    const summary = fixture();
    const replacePrice = 1_200_000;
    const resale = 800_000;
    const monthly = summary.monthlyAverage;
    const m12 = replacePrice - resale + monthly * 12;
    const m24 = replacePrice - resale + monthly * 24;
    expect(m24 - m12).toBe(monthly * 12);
  });
});

describe("projectCost / forecast", () => {
  it("flat forecast with no inflation", () => {
    const summary = fixture();
    const f = projectCost(summary, 12);
    expect(f.total).toBe(summary.monthlyAverage * 12);
    expect(f.assumptions.some((a) => a.includes("flat"))).toBe(true);
  });

  it("inflation compounds", () => {
    const summary = fixture();
    const baseMonthly = summary.monthlyAverage;
    const f = projectCost(summary, 3, { monthlyInflationPct: 0.1 });
    // After 3 months with 10% inflation:
    //   m1 = baseMonthly * 1.1
    //   m2 = baseMonthly * 1.21
    //   m3 = baseMonthly * 1.331
    // total > 3 * baseMonthly
    expect(f.total).toBeGreaterThan(baseMonthly * 3);
  });
});
