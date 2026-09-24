import { NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling, parseJson, ok } from "@/lib/http";
import { requireUser, assertOwnership } from "@/lib/auth";
import { db } from "@/lib/db";

const UpdateSchema = z.object({
  date: z.string().optional(),
  mileage: z.number().int().min(0).optional(),
  liters: z.number().min(0).nullable().optional(),
  kwh: z.number().min(0).nullable().optional(),
  amountCents: z.number().int().min(1).optional(),
  pricePerUnit: z.number().min(0).nullable().optional(),
  station: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  fullTank: z.boolean().optional(),
});

export const PATCH = withErrorHandling(async (req: Request, ctx: { params: { id: string } }) => {
  const user = await requireUser();
  const { id } = ctx.params;
  const f = await db.fuelEntry.findUnique({ where: { id } });
  if (!f) return NextResponse.json({ error: "Not found" }, { status: 404 });
  assertOwnership(f.userId, user);
  const body = await parseJson(req, UpdateSchema);
  const data: Record<string, unknown> = { ...body };
  if (body.date) data.date = new Date(body.date);
  return ok(await db.fuelEntry.update({ where: { id }, data }));
});

export const DELETE = withErrorHandling(async (_req: Request, ctx: { params: { id: string } }) => {
  const user = await requireUser();
  const { id } = ctx.params;
  const f = await db.fuelEntry.findUnique({ where: { id } });
  if (!f) return NextResponse.json({ error: "Not found" }, { status: 404 });
  assertOwnership(f.userId, user);
  await db.fuelEntry.delete({ where: { id } });
  return ok({ ok: true });
});
