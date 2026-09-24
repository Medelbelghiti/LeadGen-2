import { NextResponse } from "next/server";
import { withErrorHandling, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeVehicleCost } from "@/lib/compute-cost";
import { formatMoney, projectCost } from "@/lib/finance";

export const GET = withErrorHandling(async (req) => {
  const user = await requireUser();
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").toLowerCase().trim();
  const vehicles = await db.vehicle.findMany({ where: { userId: user.id, archived: false } });
  if (vehicles.length === 0) return ok({ answer: "You have not added any vehicles yet.", sources: [] });
  const vehicle = vehicles.find((v) => v.isPrimary) ?? vehicles[0];
  const summary = await computeVehicleCost(user.id, vehicle.id);
  const currency = vehicle.purchaseCurrency ?? "USD";
  if (!summary.monthsOfData) return ok({ answer: "I do not have enough data yet for your " + vehicle.year + " " + vehicle.brand + " " + vehicle.model + ". Add a few expenses to start getting answers.", sources: [], vehicleId: vehicle.id });

  const monthly = summary.monthlyAverage;
  const f12 = projectCost(summary, 12);

  if (matches(q, ["month", "this month"])) return ok({ answer: "Based on your last " + summary.monthsOfData + " months, your average monthly cost is " + formatMoney(monthly, currency) + ".", sources: ["Average over " + summary.monthsOfData + " month(s)"], vehicleId: vehicle.id });
  if (matches(q, ["cost per km", "per km", "per kilometer"])) {
    if (summary.costPerKm == null) return ok({ answer: "Not enough distance data to compute cost per km yet.", sources: [], vehicleId: vehicle.id });
    return ok({ answer: "Your cost per " + (vehicle.currentMileageUnit ?? "km") + " is " + formatMoney(summary.costPerKm, currency) + ".", sources: ["Over " + (summary.totalDistance?.toLocaleString() ?? 0) + " " + (vehicle.currentMileageUnit ?? "km")], vehicleId: vehicle.id });
  }
  if (matches(q, ["fuel", "essence", "carburant"])) return ok({ answer: "Total fuel spending recorded: " + formatMoney(summary.totalFuel, currency) + ".", sources: ["Sum of all fuel entries"], vehicleId: vehicle.id });
  if (matches(q, ["most expensive", "biggest", "largest"])) {
    const top = summary.breakdown[0];
    if (!top) return ok({ answer: "No data yet.", sources: [], vehicleId: vehicle.id });
    return ok({ answer: "Your largest spending category is " + top.category + " (" + formatMoney(top.amount, currency) + ", " + top.percent + "% of total).", sources: ["Breakdown of recorded expenses"], vehicleId: vehicle.id });
  }
  if (matches(q, ["annual", "year", "annuel"])) return ok({ answer: "Your estimated annual cost is " + formatMoney(summary.annualEstimate, currency) + " (ACTUAL). Forecast for the next 12 months: " + formatMoney(f12.total, currency) + " (FLAT).", sources: ["ACTUAL average x 12", "FLAT forecast"], vehicleId: vehicle.id });
  if (matches(q, ["12 months", "next year", "forecast", "future"])) return ok({ answer: "12-month flat forecast: " + formatMoney(f12.total, currency) + ". Assumption: " + f12.assumptions.join("; ") + ".", sources: f12.assumptions, vehicleId: vehicle.id });
  if (matches(q, ["insurance", "assurance"])) return ok({ answer: "Recorded insurance + financing + tax: " + formatMoney(summary.totalInsurance, currency) + ".", sources: ["Sum across insurance/tax/financing"], vehicleId: vehicle.id });
  if (matches(q, ["maintenance", "entretien"])) return ok({ answer: "Recorded maintenance spending: " + formatMoney(summary.totalMaintenance, currency) + ".", sources: ["Sum of maintenance expenses"], vehicleId: vehicle.id });
  if (matches(q, ["total", "spent", "depenses"])) return ok({ answer: "Total recorded spending: " + formatMoney(summary.totalSpent, currency) + " across " + summary.monthsOfData + " month(s).", sources: ["Sum of all expenses + fuel"], vehicleId: vehicle.id });

  return ok({ answer: "I can answer questions about: spending this month, cost per km, fuel, insurance, maintenance, total spending, annual estimate, and 12-month forecast. Try one of the suggestions below.", sources: [], vehicleId: vehicle.id });
});

function matches(q: string, keys: string[]): boolean {
  if (!q) return false;
  return keys.some((k) => q.includes(k));
}
