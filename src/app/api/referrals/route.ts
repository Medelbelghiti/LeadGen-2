import { withErrorHandling, ok } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { getOrCreateReferralCode, buildReferralUrl } from "@/lib/referrals";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  const code = await getOrCreateReferralCode(user.id);
  const events = await db.referral.findMany({
    where: { referrerId: user.id },
    orderBy: { createdAt: "desc" },
    include: { referredUser: { select: { email: true, name: true, createdAt: true } } },
  });
  return ok({
    code,
    url: buildReferralUrl(env.appUrl, code),
    events: events.map((e) => ({
      id: e.id,
      status: e.status,
      createdAt: e.createdAt,
      convertedAt: e.convertedAt,
      revenueCents: e.revenueCents,
      commissionCents: e.commissionCents,
      rewardGranted: e.rewardGranted,
      referred: { email: e.referredUser.email, name: e.referredUser.name },
    })),
  });
});
