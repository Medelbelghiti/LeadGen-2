import { NextResponse } from "next/server";
import { withErrorHandling, ok } from "@/lib/http";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertOwnership } from "@/lib/auth";
import { AuthError } from "@/lib/auth";

export const GET = withErrorHandling(async (_req: Request, ctx: { params: { id: string } }) => {
  const user = await requireUser();
  const { id } = ctx.params;
  const search = await db.search.findUnique({ where: { id } });
  if (!search) return NextResponse.json({ error: "Not found" }, { status: 404 });
  assertOwnership(search.userId, user);
  return ok(search);
});

export const DELETE = withErrorHandling(async (_req: Request, ctx: { params: { id: string } }) => {
  const user = await requireUser();
  const { id } = ctx.params;
  const search = await db.search.findUnique({ where: { id } });
  if (!search) return NextResponse.json({ error: "Not found" }, { status: 404 });
  assertOwnership(search.userId, user);
  await db.lead.deleteMany({ where: { searchId: id } });
  await db.search.delete({ where: { id } });
  return ok({ ok: true });
});
