import { NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling, parseJson, ok } from "@/lib/http";
import { requireUser, assertOwnership } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEntitlements } from "@/lib/plans";
import { buildPeriodKey, tryConsume, release } from "@/lib/quota";
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

  // 1. Vehicle ownership.
  const vehicle = await db.vehicle.findUnique({ where: { id: body.vehicleId } });
  if (!vehicle) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  assertOwnership(vehicle.userId, user);

  // 2. Authoritative entitlement + atomic quota reservation.
  const ent = await getEntitlements(user);
  const periodKey = buildPeriodKey(new Date(), { trial: ent.isTrial, userId: user.id });
  const reservation = await tryConsume({
    userId: user.id,
    metric: "expenses",
    periodKey,
    limit: ent.maxExpensesPerMonth,
  });
  if (!reservation.allowed) {
    return NextResponse.json(
      {
        error: ent.maxExpensesPerMonth === 0
          ? "Expense entry is not included in your plan"
          : `Monthly expense limit reached (${ent.maxExpensesPerMonth})`,
        code: "EXPENSE_QUOTA_EXCEEDED",
      },
      { status: 403 }
    );
  }

  // 3. Create the expense. If this fails, release the quota reservation.
  let created;
  try {
    created = await db.expense.create({
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
  } catch (e) {
    await release({ userId: user.id, metric: "expenses", periodKey }).catch(() => {});
    throw e;
  }

  return ok(created);
});
