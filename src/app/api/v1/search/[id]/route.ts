import { NextResponse } from "next/server";
import { withErrorHandling, ok } from "@/lib/http";
import { authenticateApiKey } from "@/lib/api-keys";
import { db } from "@/lib/db";
import { assertOwnership } from "@/lib/auth";

export const GET = withErrorHandling(async (req: Request, ctx: { params: { id: string } }) => {
  const auth = await authenticateApiKey(req);
  if (!auth) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  const user = await db.user.findUnique({ where: { id: auth.userId } });
  if (!user || user.deletedAt) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  const { id } = ctx.params;
  const search = await db.search.findUnique({ where: { id } });
  if (!search) return NextResponse.json({ error: "Not found" }, { status: 404 });
  assertOwnership(search.userId, user);
  return ok(search);
});
