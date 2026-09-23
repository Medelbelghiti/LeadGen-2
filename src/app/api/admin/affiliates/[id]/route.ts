import { NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling, parseJson, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { markAffiliatePaid } from "@/lib/affiliates";

const Schema = z.object({
  status: z.enum(["PENDING", "APPROVED", "SUSPENDED", "REJECTED"]).optional(),
  markPaidCents: z.number().int().min(0).optional(),
});

export const PATCH = withErrorHandling(async (req: Request, ctx: { params: { id: string } }) => {
  await requireAdmin();
  const { id } = ctx.params;
  const body = await parseJson(req, Schema);
  if (body.markPaidCents && body.markPaidCents > 0) {
    await markAffiliatePaid(id, body.markPaidCents);
    return ok({ ok: true });
  }
  if (body.status) {
    await db.affiliate.update({ where: { id }, data: { status: body.status } });
  }
  return ok({ ok: true });
});
