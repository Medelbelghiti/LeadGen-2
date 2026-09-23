import { NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling, parseJson, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

const Schema = z.object({ ids: z.array(z.string()).optional(), all: z.boolean().optional() });

export const POST = withErrorHandling(async (req) => {
  const user = await requireUser();
  const body = await parseJson(req, Schema);
  if (body.all) {
    await db.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
  } else if (body.ids && body.ids.length > 0) {
    await db.notification.updateMany({
      where: { userId: user.id, id: { in: body.ids }, readAt: null },
      data: { readAt: new Date() },
    });
  } else {
    return NextResponse.json({ error: "Provide ids or all=true" }, { status: 400 });
  }
  return ok({ ok: true });
});
