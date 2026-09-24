import { NextResponse } from "next/server";
import { withErrorHandling, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const POST = withErrorHandling(async (_req: Request, ctx: { params: { token: string } }) => {
  const user = await requireUser();
  const link = await db.shareLink.findUnique({ where: { token: ctx.params.token } });
  if (!link || link.userId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.shareLink.update({ where: { id: link.id }, data: { revokedAt: new Date() } });
  return ok({ ok: true });
});
