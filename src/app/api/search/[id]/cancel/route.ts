import { NextResponse } from "next/server";
import { withErrorHandling, ok } from "@/lib/http";
import { db } from "@/lib/db";
import { requireUser, assertOwnership } from "@/lib/auth";

export const POST = withErrorHandling(async (_req: Request, ctx: { params: { id: string } }) => {
  const user = await requireUser();
  const { id } = ctx.params;
  const search = await db.search.findUnique({ where: { id } });
  if (!search) return NextResponse.json({ error: "Not found" }, { status: 404 });
  assertOwnership(search.userId, user);
  if (search.status === "COMPLETED" || search.status === "FAILED" || search.status === "CANCELED") {
    return NextResponse.json({ error: "Already finished" }, { status: 400 });
  }
  await db.search.update({ where: { id }, data: { cancelRequested: true } });
  return ok({ ok: true });
});
