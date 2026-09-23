import { db } from "./db";
import { getAffiliateSettings } from "./settings";
import { env } from "./env";
import { randomToken } from "./utils";
import { createNotification } from "./notifications";
import { sendEmail, tplAffiliatePayout } from "./email";

const AFFILIATE_COOKIE = "lg_aff";

export function buildAffiliateLink(appUrl: string, code: string): string {
  return `${appUrl}/r/${encodeURIComponent(code)}`;
}

export async function applyForAffiliate(userId: string): Promise<{ ok: boolean; code?: string; error?: string }> {
  const existing = await db.affiliate.findUnique({ where: { userId } });
  if (existing) return { ok: true, code: existing.code };
  const settings = await getAffiliateSettings();
  if (!settings.affiliate_enabled) return { ok: false, error: "Affiliate program is disabled" };

  let code = randomToken(6).toUpperCase();
  for (let i = 0; i < 5; i++) {
    const dupe = await db.affiliate.findUnique({ where: { code } });
    if (!dupe) break;
    code = randomToken(6).toUpperCase();
  }

  const aff = await db.affiliate.create({
    data: { userId, code, status: "PENDING" },
  });
  return { ok: true, code: aff.code };
}

export async function getAffiliateByCode(code: string) {
  return db.affiliate.findUnique({ where: { code } });
}

export async function recordAffiliateClick(affiliateId: string, ip: string, userAgent: string): Promise<void> {
  await db.affiliateClick.create({
    data: { affiliateId, ip, userAgent },
  });
  await db.affiliate.update({
    where: { id: affiliateId },
    data: { clicks: { increment: 1 } },
  });
}

export async function attributeAffiliateOnSignup(userId: string, code: string | null | undefined): Promise<void> {
  if (!code) return;
  const settings = await getAffiliateSettings();
  if (!settings.affiliate_enabled) return;
  const aff = await db.affiliate.findUnique({ where: { code } });
  if (!aff || aff.status !== "APPROVED") return;
  await db.affiliate.update({
    where: { id: aff.id },
    data: { signups: { increment: 1 } },
  });
  await db.user.update({ where: { id: userId }, data: { referredById: aff.userId } });
}

export async function processAffiliateCommission(params: {
  userId: string;
  invoiceAmountCents: number;
}): Promise<void> {
  const settings = await getAffiliateSettings();
  const user = await db.user.findUnique({ where: { id: params.userId } });
  if (!user || !user.referredById) return;
  const aff = await db.affiliate.findUnique({ where: { userId: user.referredById } });
  if (!aff || aff.status !== "APPROVED") return;

  const commission = Math.round((params.invoiceAmountCents * settings.commission_percentage) / 100);
  await db.affiliate.update({
    where: { id: aff.id },
    data: {
      paidUsers: { increment: 1 },
      revenueCents: { increment: params.invoiceAmountCents },
      commissionCents: { increment: commission },
      pendingCents: { increment: commission },
    },
  });
}

export async function markAffiliatePaid(affiliateId: string, amountCents: number): Promise<void> {
  const aff = await db.affiliate.update({
    where: { id: affiliateId },
    data: {
      pendingCents: { decrement: amountCents },
      paidCents: { increment: amountCents },
    },
  });
  await db.affiliatePayout.create({
    data: { affiliateId, amountCents, status: "PAID", method: "manual", paidAt: new Date() },
  });
  const owner = await db.user.findUnique({ where: { id: aff.userId } });
  if (owner) {
    await createNotification({
      userId: owner.id,
      type: "AFFILIATE_PAYOUT",
      title: "Affiliate payout processed",
      body: `${(amountCents / 100).toFixed(2)} ${(env.stripeMode ?? "test").toUpperCase()}`,
    });
    await sendEmail({
      ...tplAffiliatePayout(owner.name, `${(amountCents / 100).toFixed(2)}`),
      to: owner.email,
    });
  }
}

export const AFFILIATE_COOKIE_NAME = AFFILIATE_COOKIE;
