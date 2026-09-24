import { db } from "./db";
import { summarizeExpenses, type CostSummary, type RawExpense, type RawFuelEntry } from "./finance";

export async function computeVehicleCost(userId: string, vehicleId: string): Promise<CostSummary> {
  const [expenses, fuel] = await Promise.all([
    db.expense.findMany({ where: { userId, vehicleId }, select: { amountCents: true, currency: true, date: true, category: true, mileage: true } }),
    db.fuelEntry.findMany({ where: { userId, vehicleId }, select: { amountCents: true, currency: true, date: true, liters: true, kwh: true, mileage: true, fullTank: true } }),
  ]);
  const rawExpenses: RawExpense[] = expenses.map((e) => ({
    amountCents: e.amountCents, currency: e.currency, date: e.date, category: e.category, mileage: e.mileage,
  }));
  const rawFuel: RawFuelEntry[] = fuel.map((f) => ({
    amountCents: f.amountCents, currency: f.currency, date: f.date,
    liters: f.liters, kwh: f.kwh, mileage: f.mileage, fullTank: f.fullTank,
  }));
  const currency = expenses[0]?.currency ?? fuel[0]?.currency ?? "USD";
  return summarizeExpenses(rawExpenses, rawFuel, currency);
}

/** Compute fuel consumption (L/100km) from liters used and distance driven. */
export function computeFuelConsumption(liters: number, distance: number): number {
  if (!liters || !distance) return 0;
  return Math.round((liters / distance) * 10000) / 100;
}
