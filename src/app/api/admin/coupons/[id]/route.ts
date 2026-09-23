import { NextResponse } from "next/server";
import { withErrorHandling, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const PATCH = withErrorHandling(async (req: Request, ctx: { params: { id: string } }) => {
  await requireAdmin();
  const { id } = ctx.params;
  const body = await req.json();
  const updated = await db.coupon.update({ where: { id }, data: body });
  return ok(updated);
});

export const DELETE = withErrorHandling(async (_req: Request, ctx: { params: { id: string } }) => {
  await requireAdmin();
  const { id } = ctx.params;
  await db.coupon.update({ where: { id }, data: { active: false } });
  return ok({ ok: true });
});
