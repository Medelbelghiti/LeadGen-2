import { NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling, parseJson, ok } from "@/lib/http";
import { requireUser, assertOwnership } from "@/lib/auth";
import { db } from "@/lib/db";

const Schema = z.object({
  vehicleId: z.string(),
  name: z.string().min(1).max(80),
  type: z.enum(["keep_vs_replace", "fuel_price", "mileage_change", "repair_vs_replace"]),
  inputs: z.record(z.string(), z.any()),
  outputs: z.record(z.string(), z.any()),
});

export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  const scenarios = await db.scenario.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 });
  return ok({ scenarios });
});

export const POST = withErrorHandling(async (req) => {
  const user = await requireUser();
  const body = await parseJson(req, Schema);
  const vehicle = await db.vehicle.findUnique({ where: { id: body.vehicleId } });
  if (!vehicle) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  assertOwnership(vehicle.userId, user);
  const created = await db.scenario.create({
    data: {
      userId: user.id, vehicleId: body.vehicleId, name: body.name, type: body.type,
      inputsJson: JSON.stringify(body.inputs), outputsJson: JSON.stringify(body.outputs),
    },
  });
  return ok(created);
});
