import { NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling, parseJson, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEntitlements } from "@/lib/plans";
import { buildPeriodKey, tryConsume, release } from "@/lib/quota";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";

const VehicleSchema = z.object({
  brand: z.string().min(1).max(60),
  model: z.string().min(1).max(60),
  year: z.number().int().min(1900).max(2100),
  trim: z.string().max(60).nullable().optional(),
  fuelType: z.string().min(1).max(40),
  transmission: z.string().max(40).nullable().optional(),
  drivetrain: z.string().max(40).nullable().optional(),
  engineDisplacementCc: z.number().int().min(0).max(20000).nullable().optional(),
  horsepowerHp: z.number().int().min(0).max(2000).nullable().optional(),
  fuelEconomyText: z.string().max(80).nullable().optional(),
  purchaseDate: z.string().nullable().optional(),
  purchasePriceCents: z.number().int().min(0).nullable().optional(),
  purchaseCurrency: z.enum(SUPPORTED_CURRENCIES).optional(),
  estimatedResaleCents: z.number().int().min(0).nullable().optional(),
  currentMileage: z.number().int().min(0).nullable().optional(),
  currentMileageUnit: z.string().optional(),
  nickname: z.string().max(60).nullable().optional(),
  vin: z.string().max(40).nullable().optional(),
  licensePlate: z.string().max(40).nullable().optional(),
  isPrimary: z.boolean().optional(),
});

export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  const vehicles = await db.vehicle.findMany({
    where: { userId: user.id },
    orderBy: [{ archived: "asc" }, { isPrimary: "desc" }, { createdAt: "desc" }],
  });
  return ok({ vehicles });
});

export const POST = withErrorHandling(async (req) => {
  const user = await requireUser();
  const body = await parseJson(req, VehicleSchema);

  const ent = await getEntitlements(user);
  const periodKey = buildPeriodKey(new Date(), { trial: ent.isTrial, userId: user.id });

  // Atomic quota reservation — concurrency-safe.
  const reservation = await tryConsume({
    userId: user.id,
    metric: "vehicles",
    periodKey,
    limit: ent.maxVehicles,
  });
  if (!reservation.allowed) {
    return NextResponse.json(
      {
        error: ent.maxVehicles === 0
          ? "Vehicles are not included in your plan"
          : `Plan limit reached (${ent.maxVehicles} vehicles). Upgrade to add more.`,
        code: "VEHICLE_QUOTA_EXCEEDED",
      },
      { status: 403 }
    );
  }

  // Primary vehicle handling: clear other primaries in the same transaction.
  let created;
  try {
    created = await db.$transaction(async (tx) => {
      if (body.isPrimary) {
        await tx.vehicle.updateMany({
          where: { userId: user.id, isPrimary: true },
          data: { isPrimary: false },
        });
      }
      return tx.vehicle.create({
        data: {
          userId: user.id,
          brand: body.brand,
          model: body.model,
          year: body.year,
          trim: body.trim ?? null,
          fuelType: body.fuelType,
          transmission: body.transmission ?? null,
          drivetrain: body.drivetrain ?? null,
          engineDisplacementCc: body.engineDisplacementCc ?? null,
          horsepowerHp: body.horsepowerHp ?? null,
          fuelEconomyText: body.fuelEconomyText ?? null,
          purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
          purchasePriceCents: body.purchasePriceCents ?? null,
          purchaseCurrency: body.purchaseCurrency ?? user.currency,
          estimatedResaleCents: body.estimatedResaleCents ?? null,
          currentMileage: body.currentMileage ?? null,
          currentMileageUnit: body.currentMileageUnit ?? user.distanceUnit,
          nickname: body.nickname ?? null,
          vin: body.vin ?? null,
          licensePlate: body.licensePlate ?? null,
          isPrimary: body.isPrimary ?? false,
        },
      });
    });
  } catch (e) {
    await release({ userId: user.id, metric: "vehicles", periodKey }).catch(() => {});
    throw e;
  }

  return ok(created);
});
