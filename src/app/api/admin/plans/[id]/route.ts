import { NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling, parseJson, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

const PatchSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  priceCents: z.number().int().min(0).optional(),
  monthlyLeadLimit: z.number().int().min(0).optional(),
  monthlySearchLimit: z.number().int().min(0).optional(),
  dailySearchLimit: z.number().int().min(0).optional(),
  exportLimit: z.number().int().min(0).optional(),
  maxResultsPerSearch: z.number().int().min(1).optional(),
  providers: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
  teamMembersLimit: z.number().int().min(1).optional(),
  apiAccess: z.boolean().optional(),
  apiMonthlyQuota: z.number().int().min(0).optional(),
  stripePriceId: z.string().optional(),
  stripeProductId: z.string().optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const PATCH = withErrorHandling(async (req: Request, ctx: { params: { id: string } }) => {
  await requireAdmin();
  const { id } = ctx.params;
  const body = await parseJson(req, PatchSchema);
  const data: Record<string, unknown> = { ...body };
  if (body.providers) data.providers = JSON.stringify(body.providers);
  if (body.features) data.features = JSON.stringify(body.features);
  const updated = await db.plan.update({ where: { id }, data });
  return ok(updated);
});

export const DELETE = withErrorHandling(async (_req: Request, ctx: { params: { id: string } }) => {
  await requireAdmin();
  const { id } = ctx.params;
  await db.plan.update({ where: { id }, data: { active: false } });
  return ok({ ok: true });
});
