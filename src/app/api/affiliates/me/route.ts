import { NextResponse } from "next/server";
import { withErrorHandling, parseJson, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { applyForAffiliate, buildAffiliateLink } from "@/lib/affiliates";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { AffiliateApplySchema } from "@/lib/schemas";

export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  const aff = await db.affiliate.findUnique({
    where: { userId: user.id },
    include: { payouts: { orderBy: { createdAt: "desc" }, take: 20 } },
  });
  if (!aff) return ok({ affiliate: null });
  return ok({
    affiliate: {
      ...aff,
      url: buildAffiliateLink(env.appUrl, aff.code),
    },
  });
});

export const POST = withErrorHandling(async (req) => {
  const user = await requireUser();
  await parseJson(req, AffiliateApplySchema);
  const res = await applyForAffiliate(user.id);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
  return ok({ code: res.code });
});
