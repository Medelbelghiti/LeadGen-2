import { NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling, parseJson, ok } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

const Schema = z.object({
  code: z.string().min(1).max(40),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.number().int().min(1),
  duration: z.enum(["ONCE", "FIRST_MONTH", "FOREVER"]).default("ONCE"),
  durationMonths: z.number().int().min(1).optional(),
  firstPurchaseOnly: z.boolean().default(false),
  expiresAt: z.string().datetime().optional(),
  maxRedemptions: z.number().int().min(1).optional(),
  perUserLimit: z.number().int().min(1).default(1),
  minPurchaseCents: z.number().int().min(0).optional(),
  planKeys: z.array(z.string()).default([]),
  active: z.boolean().default(true),
});

export const GET = withErrorHandling(async () => {
  await requireAdmin();
  const items = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return ok({ items });
});

export const POST = withErrorHandling(async (req) => {
  await requireAdmin();
  const body = await parseJson(req, Schema);
  const code = body.code.toUpperCase();
  const created = await db.coupon.create({
    data: {
      code,
      type: body.type,
      value: body.value,
      duration: body.duration,
      durationMonths: body.durationMonths,
      firstPurchaseOnly: body.firstPurchaseOnly,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      maxRedemptions: body.maxRedemptions,
      perUserLimit: body.perUserLimit,
      minPurchaseCents: body.minPurchaseCents,
      planKeys: JSON.stringify(body.planKeys),
      active: body.active,
    },
  });
  return ok(created);
});
