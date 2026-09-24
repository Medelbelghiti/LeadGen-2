/**
 * Financial engine for AutoEco.
 * Pure functions: testable in isolation, free of UI dependencies.
 */

export type Category =
  | "fuel" | "maintenance" | "repair" | "insurance" | "tax"
  | "registration" | "tires" | "parking" | "tolls" | "cleaning"
  | "accessories" | "financing" | "charging" | "other";

export interface RawExpense {
  amountCents: number;
  currency: string;
  date: Date;
  category: string;
  mileage?: number | null;
}

export interface RawFuelEntry {
  date: Date;
  amountCents: number;
  currency: string;
  liters?: number | null;
  kwh?: number | null;
  mileage: number;
  fullTank: boolean;
}

export interface CostSummary {
  totalSpent: number;
  totalFuel: number;
  totalMaintenance: number;
  totalRepair: number;
  totalInsurance: number;
  totalOther: number;
  totalDistance: number | null;
  monthsOfData: number;
  monthlyAverage: number;
  annualEstimate: number;
  costPerKm: number | null;
  missingDistance: boolean;
  breakdown: { category: string; amount: number; percent: number }[];
}

export function summarizeExpenses(
  expenses: RawExpense[],
  fuel: RawFuelEntry[],
  _currency: string,
  _now: Date = new Date()
): CostSummary {
  let totalFuel = 0;
  let totalMaintenance = 0;
  let totalRepair = 0;
  let totalInsurance = 0;
  let totalOther = 0;
  let totalDistance: number | null = null;
  const monthsSet = new Set<string>();

  for (const e of expenses) {
    monthsSet.add(yyyymm(e.date));
    switch (normalizeCategory(e.category)) {
      case "fuel": case "charging": totalFuel += e.amountCents; break;
      case "maintenance": totalMaintenance += e.amountCents; break;
      case "repair": totalRepair += e.amountCents; break;
      case "insurance": case "tax": case "registration": case "financing": totalInsurance += e.amountCents; break;
      case "parking": case "tolls": case "cleaning": case "tires": case "accessories": totalOther += e.amountCents; break;
      case "other": totalOther += e.amountCents; break;
    }
  }
  for (const f of fuel) {
    monthsSet.add(yyyymm(f.date));
    totalFuel += f.amountCents;
  }

  const monthsOfData = monthsSet.size || 1;
  const totalSpent = totalFuel + totalMaintenance + totalRepair + totalInsurance + totalOther;
  const monthlyAverage = Math.round(totalSpent / monthsOfData);
  const annualEstimate = monthlyAverage * 12;

  const mileages = expenses.map((e) => e.mileage ?? 0).filter((m) => m > 0) as number[];
  if (mileages.length >= 2) {
    const min = Math.min(...mileages);
    const max = Math.max(...mileages);
    totalDistance = Math.max(0, max - min);
  }
  if (totalDistance == null && fuel.length >= 2) {
    const sorted = [...fuel].sort((a, b) => +a.date - +b.date);
    totalDistance = Math.max(0, sorted[sorted.length - 1].mileage - sorted[0].mileage);
  }

  const costPerKm = totalDistance && totalDistance > 0 ? Math.round(totalSpent / totalDistance) : null;

  const totalForBreakdown = Math.max(1, totalSpent);
  const breakdown = [
    { category: "fuel", amount: totalFuel, percent: Math.round((totalFuel / totalForBreakdown) * 100) },
    { category: "maintenance", amount: totalMaintenance, percent: Math.round((totalMaintenance / totalForBreakdown) * 100) },
    { category: "repair", amount: totalRepair, percent: Math.round((totalRepair / totalForBreakdown) * 100) },
    { category: "insurance", amount: totalInsurance, percent: Math.round((totalInsurance / totalForBreakdown) * 100) },
    { category: "other", amount: totalOther, percent: Math.round((totalOther / totalForBreakdown) * 100) },
  ].sort((a, b) => b.amount - a.amount);

  return {
    totalSpent, totalFuel, totalMaintenance, totalRepair, totalInsurance, totalOther,
    totalDistance, monthsOfData, monthlyAverage, annualEstimate, costPerKm,
    missingDistance: totalDistance == null, breakdown,
  };
}

function normalizeCategory(c: string): Category {
  const v = c.toLowerCase().trim();
  const allowed: Category[] = ["fuel", "maintenance", "repair", "insurance", "tax", "registration", "tires", "parking", "tolls", "cleaning", "accessories", "financing", "charging", "other"];
  return (allowed as string[]).includes(v) ? (v as Category) : "other";
}

function yyyymm(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function formatMoney(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

export interface Forecast {
  monthlyAverage: number;
  horizonMonths: number;
  total: number;
  assumptions: string[];
}

export function projectCost(summary: CostSummary, horizonMonths: number, opts: { monthlyInflationPct?: number } = {}): Forecast {
  const inflation = opts.monthlyInflationPct ?? 0;
  let total = 0;
  const assumptions: string[] = [
    `Based on ${summary.monthsOfData} months of actual recorded data`,
    `Monthly average: ${formatMoney(summary.monthlyAverage)}`,
  ];
  if (inflation > 0) {
    let running = summary.monthlyAverage;
    for (let m = 1; m <= horizonMonths; m++) {
      running = Math.round(running * (1 + inflation));
      total += running;
    }
    assumptions.push(`${(inflation * 100).toFixed(2)}% monthly cost inflation assumed`);
  } else {
    total = summary.monthlyAverage * horizonMonths;
    assumptions.push("No monthly inflation assumed (constant cost projection)");
  }
  return { monthlyAverage: summary.monthlyAverage, horizonMonths, total, assumptions };
}

export interface DepreciationInputs {
  purchasePriceCents: number;
  purchaseDate: Date;
  currentResaleCents?: number | null;
  yearsOwned?: number;
}

export interface DepreciationResult {
  currentValueCents: number | null;
  totalDepreciationCents: number;
  perYearCents: number | null;
  method: "user-provided" | "straight-line-20pct";
  note: string;
}

export function computeDepreciation(input: DepreciationInputs, now: Date = new Date()): DepreciationResult {
  const years = input.yearsOwned ?? yearsBetween(input.purchaseDate, now);
  if (input.currentResaleCents != null && input.currentResaleCents > 0) {
    const total = Math.max(0, input.purchasePriceCents - input.currentResaleCents);
    return {
      currentValueCents: input.currentResaleCents,
      totalDepreciationCents: total,
      perYearCents: years > 0 ? Math.round(total / years) : null,
      method: "user-provided",
      note: "Based on the resale value you provided.",
    };
  }
  const remainingPct = Math.max(0, 1 - 0.2 * years);
  const currentValue = Math.round(input.purchasePriceCents * remainingPct);
  const total = Math.max(0, input.purchasePriceCents - currentValue);
  return {
    currentValueCents: currentValue,
    totalDepreciationCents: total,
    perYearCents: years > 0 ? Math.round(total / years) : null,
    method: "straight-line-20pct",
    note: "Straight-line 20% per year estimate. Provide your own resale value for accuracy.",
  };
}

function yearsBetween(a: Date, b: Date): number {
  return Math.max(0, (+b - +a) / (365.25 * 24 * 60 * 60 * 1000));
}

export function estimateCO2Kg(opts: { liters?: number; kwh?: number; gridFactor?: number }): number {
  if (opts.liters) return Math.round(opts.liters * 2.31 * 100) / 100;
  if (opts.kwh) return Math.round(opts.kwh * (opts.gridFactor ?? 0.4) * 100) / 100;
  return 0;
}

export interface CostInputs {
  purchasePriceCents: number;
  purchaseDate: Date;
  estimatedResaleCents: number | null;
  monthlyFixedCents?: number;
}

export function trueOwnershipCost(
  summary: CostSummary,
  inputs: CostInputs,
  horizonMonths: number,
  now: Date = new Date()
): { total: number; breakdown: { label: string; cents: number; source: "actual" | "estimate" | "forecast" }[] } {
  const depreciation = computeDepreciation(inputs, now);
  const projectedFuelAndMaint = summary.monthlyAverage * horizonMonths;
  const fixed = (inputs.monthlyFixedCents ?? 0) * horizonMonths;
  const total = projectedFuelAndMaint + fixed + depreciation.totalDepreciationCents;
  return {
    total,
    breakdown: [
      { label: "Fuel + maintenance (projected)", cents: projectedFuelAndMaint, source: "forecast" },
      { label: "Insurance + taxes (projected)", cents: fixed, source: "estimate" },
      { label: "Depreciation (estimated)", cents: depreciation.totalDepreciationCents, source: "estimate" },
    ],
  };
}
