import { NextResponse } from "next/server";
import { withErrorHandling, ok } from "@/lib/http";
import { db } from "@/lib/db";
import { requireUser, assertOwnership } from "@/lib/auth";

export const DELETE = withErrorHandling(async (_req: Request, ctx: { params: { id: string } }) => {
  const user = await requireUser();
  const { id } = ctx.params;
  const key = await db.apiKey.findUnique({ where: { id } });
  if (!key) return NextResponse.json({ error: "Not found" }, { status: 404 });
  assertOwnership(key.userId, user);
  await db.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
  return ok({ ok: true });
});
