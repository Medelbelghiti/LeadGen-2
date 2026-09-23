import { NextResponse } from "next/server";
import { withErrorHandling, parseJson, ok } from "@/lib/http";
import { CouponValidateSchema } from "@/lib/schemas";
import { requireUser } from "@/lib/auth";
import { validateCoupon } from "@/lib/stripe";

export const POST = withErrorHandling(async (req) => {
  const user = await requireUser();
  const body = await parseJson(req, CouponValidateSchema);
  const v = await validateCoupon(body.code, user.id, body.planId);
  if (!v.valid) return NextResponse.json({ error: v.error }, { status: 400 });
  return ok({ valid: true, couponId: v.couponId });
});
