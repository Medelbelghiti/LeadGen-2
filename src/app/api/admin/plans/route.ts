import { NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling, parseJson, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

const Schema = z.object({
  id: z.string().optional(),
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  priceCents: z.number().int().min(0),
  currency: z.string().min(1).default("usd"),
  billingPeriod: z.enum(["FREE", "MONTHLY", "YEARLY", "LIFETIME"]),
  monthlyLeadLimit: z.number().int().min(0),
  monthlySearchLimit: z.number().int().min(0),
  dailySearchLimit: z.number().int().min(0),
  exportLimit: z.number().int().min(0),
  maxResultsPerSearch: z.number().int().min(1),
  providers: z.array(z.string()),
  features: z.array(z.string()),
  teamMembersLimit: z.number().int().min(1),
  apiAccess: z.boolean(),
  apiMonthlyQuota: z.number().int().min(0),
  stripePriceId: z.string().optional(),
  stripeProductId: z.string().optional(),
  active: z.boolean(),
  sortOrder: z.number().int(),
});

export const GET = withErrorHandling(async () => {
  await requireAdmin();
  const items = await db.plan.findMany({ orderBy: { sortOrder: "asc" } });
  return ok({ items });
});

export const POST = withErrorHandling(async (req) => {
  await requireAdmin();
  const body = await parseJson(req, Schema);
  const { id, ...rest } = body;
  const created = await db.plan.create({
    data: {
      ...rest,
      providers: JSON.stringify(rest.providers),
      features: JSON.stringify(rest.features),
    },
  });
  return ok(created);
});
