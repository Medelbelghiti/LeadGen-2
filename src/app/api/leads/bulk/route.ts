import { NextResponse } from "next/server";
import { withErrorHandling, parseJson, ok } from "@/lib/http";
import { BulkLeadsSchema } from "@/lib/schemas";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const POST = withErrorHandling(async (req) => {
  const user = await requireUser();
  const body = await parseJson(req, BulkLeadsSchema);

  if (body.delete) {
    const result = await db.lead.deleteMany({
      where: { id: { in: body.ids }, userId: user.id },
    });
    return ok({ deleted: result.count });
  }
  if (body.status) {
    const result = await db.lead.updateMany({
      where: { id: { in: body.ids }, userId: user.id },
      data: { status: body.status },
    });
    return ok({ updated: result.count });
  }
  return NextResponse.json({ error: "No operation specified" }, { status: 400 });
});
