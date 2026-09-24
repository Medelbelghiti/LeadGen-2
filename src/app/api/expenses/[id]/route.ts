import { NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling, parseJson, ok } from "@/lib/http";
import { requireUser, assertOwnership } from "@/lib/auth";
import { db } from "@/lib/db";

const UpdateSchema = z.object({
  category: z.string().optional(),
  amountCents: z.number().int().min(1).optional(),
  date: z.string().optional(),
  merchant: z.string().nullable().optional(),
  mileage: z.number().int().nullable().optional(),
  notes: z.string().nullable().optional(),
  recurring: z.boolean().optional(),
});

export const GET = withErrorHandling(async (_req: Request, ctx: { params: { id: string } }) => {
  const user = await requireUser();
  const { id } = ctx.params;
  const e = await db.expense.findUnique({ where: { id } });
  if (!e) return NextResponse.json({ error: "Not found" }, { status: 404 });
  assertOwnership(e.userId, user);
  return ok(e);
});

export const PATCH = withErrorHandling(async (req: Request, ctx: { params: { id: string } }) => {
  const user = await requireUser();
  const { id } = ctx.params;
  const e = await db.expense.findUnique({ where: { id } });
  if (!e) return NextResponse.json({ error: "Not found" }, { status: 404 });
  assertOwnership(e.userId, user);
  const body = await parseJson(req, UpdateSchema);
  const data: Record<string, unknown> = { ...body };
  if (body.date) data.date = new Date(body.date);
  return ok(await db.expense.update({ where: { id }, data }));
});

export const DELETE = withErrorHandling(async (_req: Request, ctx: { params: { id: string } }) => {
  const user = await requireUser();
  const { id } = ctx.params;
  const e = await db.expense.findUnique({ where: { id } });
  if (!e) return NextResponse.json({ error: "Not found" }, { status: 404 });
  assertOwnership(e.userId, user);
  await db.expense.delete({ where: { id } });
  return ok({ ok: true });
});
