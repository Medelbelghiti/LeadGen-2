import { NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling, parseJson, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEntitlements, LimitReachedError } from "@/lib/plans";
import { getMonthlyUsage } from "@/lib/usage";
import { assertOwnership } from "@/lib/auth";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";

const ExpenseSchema = z.object({
  vehicleId: z.string().min(1),
  category: z.enum(["fuel","maintenance","repair","insurance","tax","registration","tires","parking","tolls","cleaning","accessories","financing","charging","other"]),
  amountCents: z.number().int().min(1).max(100_000_000),
  currency: z.enum(SUPPORTED_CURRENCIES),
  date: z.string().min(1),
  merchant: z.string().max(120).nullable().optional(),
  mileage: z.number().int().min(0).nullable().optional(),
  mileageUnit: z.string().optional(),
  notes: z.string().max(2000).nullable().optional(),
  recurring: z.boolean().optional(),
  source: z.enum(["manual","receipt_scan","import"]).optional(),
});

export const GET = withErrorHandling(async (req) => {
  const user = await requireUser();
  const url = new URL(req.url);
  const vehicleId = url.searchParams.get("vehicleId");
  const where: Record<string, unknown> = { userId: user.id };
  if (vehicleId) where.vehicleId = vehicleId;
  const expenses = await db.expense.findMany({ where, orderBy: { date: "desc" }, take: 200 });
  return ok({ expenses });
});

export const POST = withErrorHandling(async (req) => {
  const user = await requireUser();
  const body = await parseJson(req, ExpenseSchema);

  const vehicle = await db.vehicle.findUnique({ where: { id: body.vehicleId } });
  if (!vehicle) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  assertOwnership(vehicle.userId, user);

  const ent = await getEntitlements(user);
  const usage = await getMonthlyUsage(user.id);
  if (usage.expenses >= ent.maxExpensesPerMonth) {
    throw new LimitReachedError("expenses", `Monthly expense limit reached (${ent.maxExpensesPerMonth}).`);
  }

  const created = await db.expense.create({
    data: {
      userId: user.id,
      vehicleId: body.vehicleId,
      category: body.category,
      amountCents: body.amountCents,
      currency: body.currency,
      date: new Date(body.date),
      merchant: body.merchant ?? null,
      mileage: body.mileage ?? null,
      mileageUnit: body.mileageUnit ?? user.distanceUnit,
      notes: body.notes ?? null,
      recurring: body.recurring ?? false,
      source: body.source ?? "manual",
    },
  });
  return ok(created);
});
