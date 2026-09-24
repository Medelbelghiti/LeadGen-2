import { NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling, parseJson, ok } from "@/lib/http";
import { requireUser, assertOwnership } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeVehicleCost, computeFuelConsumption } from "@/lib/compute-cost";
import { formatMoney, type CostSummary } from "@/lib/finance";
import { requireUser as _require } from "@/lib/auth";

const InputSchema = z.object({
  vehicleId: z.string(),
  name: z.string().min(1).max(80),
  type: z.enum(["keep_vs_replace", "fuel_price", "mileage_change", "repair_vs_replace"]),
  // CLIENT sends inputs only — NEVER outputs. Server computes outputs authoritatively.
  inputs: z.object({
    fuelDeltaPct: z.number().min(-100).max(500).optional(),
    horizonMonths: z.number().int().min(1).max(600).default(36),
    extraKmPerYear: z.number().int().min(0).max(200000).optional(),
    replacePriceCents: z.number().int().min(0).max(1_000_000_000_000).optional(),
    repairCostCents: z.number().int().min(0).max(1_000_000_000).optional(),
  }),
});

export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  const scenarios = await db.scenario.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return ok({ scenarios });
});

/**
 * Server-side scenario calculation.
 *
 * The CLIENT submits only the scenario `inputs`. The server computes
 * `outputs` authoritatively from the user's actual financial data.
 * The client can NEVER submit fabricated outputs — any client-supplied
 * outputs are ignored.
 */
export const POST = withErrorHandling(async (req) => {
  const user = await requireUser();
  const body = await parseJson(req, InputSchema);

  const vehicle = await db.vehicle.findUnique({ where: { id: body.vehicleId } });
  if (!vehicle) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  assertOwnership(vehicle.userId, user);

  const costResult = await computeVehicleCost(user.id, vehicle.id);
  if (!costResult.ok) {
    return NextResponse.json({ error: "Cannot compute scenario: mixed-currency data", code: "MIXED_CURRENCY" }, { status: 422 });
  }
  const summary: CostSummary = costResult.summary;
  const currency = summary.baseCurrency;
  const inputs = body.inputs;

  const fuelShare = summary.totalFuel / Math.max(1, summary.totalSpent);
  const fuelMultiplier = 1 + (inputs.fuelDeltaPct ?? 0) / 100 * fuelShare;
  const projectedMonthly = Math.round(summary.monthlyAverage * fuelMultiplier);
  const horizon: number = inputs.horizonMonths ?? 36;
  const keepTotal = projectedMonthly * horizon;

  let replaceTotal = 0;
  let replaceAssumptions: string[] = [];
  if (body.type === "keep_vs_replace" && inputs.replacePriceCents) {
    const resale = vehicle.estimatedResaleCents
      ?? (vehicle.purchasePriceCents ? Math.round(vehicle.purchasePriceCents * 0.5) : 0);
    // Replace = purchase price - resale (capital loss) + projected operating cost
    replaceTotal = inputs.replacePriceCents - resale + projectedMonthly * horizon;
    replaceAssumptions = [
      `Current vehicle resale (ESTIMATE): ${formatMoney(resale, currency)}`,
      `Replacement price (USER INPUT): ${formatMoney(inputs.replacePriceCents, currency)}`,
      `Operating cost of replacement assumed equal to current (heuristic)`,
    ];
  } else if (body.type === "repair_vs_replace" && inputs.repairCostCents) {
    const resale = vehicle.estimatedResaleCents
      ?? (vehicle.purchasePriceCents ? Math.round(vehicle.purchasePriceCents * 0.5) : 0);
    const repairScenario = inputs.repairCostCents + projectedMonthly * horizon;
    const replaceScenario = (vehicle.purchasePriceCents ?? 0) - resale + projectedMonthly * horizon;
    replaceTotal = replaceScenario - repairScenario;
    replaceAssumptions = [
      `Repair + operating (FORECAST): ${formatMoney(repairScenario, currency)}`,
      `Replace + operating (FORECAST): ${formatMoney(replaceScenario, currency)}`,
      `Repair cost (USER INPUT): ${formatMoney(inputs.repairCostCents, currency)}`,
    ];
  }

  const diff = replaceTotal - keepTotal;
  const outputs = {
    baseMonthly: summary.monthlyAverage,
    projectedMonthly,
    horizonMonths: horizon,
    keepTotal,
    replaceTotal,
    diff,
    currency,
    assumptions: [
      `Base monthly average (ACTUAL): ${formatMoney(summary.monthlyAverage, currency)}`,
      `Fuel share of total spend (ACTUAL): ${(fuelShare * 100).toFixed(0)}%`,
      `Fuel price change (${inputs.fuelDeltaPct ?? 0}%) applied to fuel share only`,
      `Horizon: ${horizon} months`,
      ...replaceAssumptions,
    ],
  };

  const created = await db.scenario.create({
    data: {
      userId: user.id,
      vehicleId: body.vehicleId,
      name: body.name,
      type: body.type,
      // Store only server-generated outputs.
      inputsJson: JSON.stringify(inputs),
      outputsJson: JSON.stringify(outputs),
    },
  });
  return ok({ scenario: created, outputs });
});

void _require;
void computeFuelConsumption;
