import { db } from "./db";
import { summarizeExpenses, type CostSummary, type RawExpense, type RawFuelEntry, CurrencyMismatchError } from "./finance";

/**
 * Compute a CostSummary for a single vehicle.
 *
 * Returns a tagged result. If entries with mixed currencies are present,
 * returns { ok: false, error: "mixed_currency", currencies: [...] } and the
 * caller MUST handle it explicitly — never silently sum across currencies.
 */
export type VehicleCostResult =
  | { ok: true; summary: CostSummary }
  | { ok: false; error: "mixed_currency"; currencies: string[] };

export async function computeVehicleCost(userId: string, vehicleId: string): Promise<VehicleCostResult> {
  const [expenses, fuel] = await Promise.all([
    db.expense.findMany({ where: { userId, vehicleId }, select: { amountCents: true, currency: true, date: true, category: true, mileage: true } }),
    db.fuelEntry.findMany({ where: { userId, vehicleId }, select: { amountCents: true, currency: true, date: true, liters: true, kwh: true, mileage: true, fullTank: true } }),
  ]);

  if (expenses.length === 0 && fuel.length === 0) {
    const baseCurrency = "USD";
    return {
      ok: true,
      summary: summarizeExpenses([], [], baseCurrency),
    };
  }

  const baseCurrency = expenses[0]?.currency ?? fuel[0]?.currency ?? "USD";

  const rawExpenses: RawExpense[] = expenses.map((e) => ({
    amountCents: e.amountCents, currency: e.currency, date: e.date, category: e.category, mileage: e.mileage,
  }));
  const rawFuel: RawFuelEntry[] = fuel.map((f) => ({
    amountCents: f.amountCents, currency: f.currency, date: f.date,
    liters: f.liters, kwh: f.kwh, mileage: f.mileage, fullTank: f.fullTank,
  }));

  try {
    return { ok: true, summary: summarizeExpenses(rawExpenses, rawFuel, baseCurrency) };
  } catch (e) {
    if (e instanceof CurrencyMismatchError) {
      return { ok: false, error: "mixed_currency", currencies: e.currencies };
    }
    throw e;
  }
}

export function computeFuelConsumption(liters: number, distance: number): number {
  if (!Number.isFinite(liters) || !Number.isFinite(distance) || distance <= 0 || liters <= 0) return 0;
  return Math.round((liters / distance) * 10000) / 100;
}
