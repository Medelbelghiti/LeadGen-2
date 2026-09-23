import { db } from "./db";
import { getReferralSettings } from "./settings";
import { generateReferralCode } from "./utils";
import { createNotification } from "./notifications";
import { sendEmail, tplReferralConverted } from "./email";
import { env } from "./env";
import { auditLog } from "./audit";

/** Called during signup to attribute the referral. */
export async function attributeReferralOnSignup(
  userId: string,
  referredByCode: string | null | undefined,
  userEmail: string,
  userName: string | null,
  appUrl: string
): Promise<void> {
  if (!referredByCode) return;
  const settings = await getReferralSettings();
  if (!settings.referral_enabled) return;

  const referrer = await db.user.findUnique({ where: { referralCode: referredByCode } });
  if (!referrer || referrer.id === userId || referrer.deletedAt) return;

  await db.user.update({ where: { id: userId }, data: { referredById: referrer.id } });

  const ref = await db.referral.upsert({
    where: { referredUserId: userId },
    create: {
      referrerId: referrer.id,
      referredUserId: userId,
      status: "REGISTERED",
    },
    update: { referrerId: referrer.id },
  });
  await trackEvent("referral_signup", { referrerId: referrer.id, referredId: userId });
  void auditLog({ userId: referrer.id, action: "referral.signup", metadata: { referred: userId } });
  return; // ref not used directly
}

/** Called when a referred user starts a trial. */
export async function markReferralTrial(referredUserId: string): Promise<void> {
  await db.referral.updateMany({
    where: { referredUserId, status: "REGISTERED" },
    data: { status: "TRIAL_STARTED" },
  });
}

/** Called when a referred user converts to paid. Grants reward to referrer. */
export async function markReferralConverted(params: {
  referredUserId: string;
  revenueCents: number;
}): Promise<void> {
  const settings = await getReferralSettings();
  const ref = await db.referral.findUnique({ where: { referredUserId: params.referredUserId } });
  if (!ref || ref.status === "CONVERTED") return;

  const commission = Math.round((params.revenueCents * settings.referral_commission_percent) / 100);
  await db.referral.update({
    where: { id: ref.id },
    data: {
      status: "CONVERTED",
      revenueCents: params.revenueCents,
      commissionCents: commission,
      convertedAt: new Date(),
    },
  });

  // Apply reward per configured type
  if (settings.referral_reward_type === "LEADS_BONUS" && !ref.rewardGranted) {
    await db.user.update({
      where: { id: ref.referrerId },
      data: { bonusLeads: { increment: settings.referral_reward_value } },
    });
    await db.referral.update({ where: { id: ref.id }, data: { rewardGranted: true } });
  } else if (settings.referral_reward_type === "COMMISSION_PERCENT") {
    // Already stored in commissionCents on the referral; no direct balance increment.
  } else if (settings.referral_reward_type === "PLAN_MONTH" && !ref.rewardGranted) {
    const plan = await db.plan.findUnique({ where: { key: settings.referral_reward_plan_key } });
    if (plan) {
      const start = new Date();
      const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
      await db.subscription.create({
        data: {
          userId: ref.referrerId,
          planId: plan.id,
          status: "active",
          currentPeriodStart: start,
          currentPeriodEnd: end,
        },
      });
      await db.referral.update({ where: { id: ref.id }, data: { rewardGranted: true } });
    }
  }

  const referrer = await db.user.findUnique({ where: { id: ref.referrerId } });
  if (referrer) {
    const rewardText = describeReward(settings);
    await createNotification({
      userId: referrer.id,
      type: "REFERRAL_CONVERTED",
      title: "Your referral just converted",
      body: `Reward: ${rewardText}`,
      link: "/referrals",
    });
    await sendEmail({
      ...tplReferralConverted(referrer.name, rewardText),
      to: referrer.email,
    });
  }
}

function describeReward(s: Awaited<ReturnType<typeof getReferralSettings>>): string {
  if (s.referral_reward_type === "LEADS_BONUS") return `+${s.referral_reward_value} leads`;
  if (s.referral_reward_type === "COMMISSION_PERCENT") return `${s.referral_commission_percent}% commission`;
  return `1 month of ${s.referral_reward_plan_key} free`;
}

export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (user.referralCode) return user.referralCode;
  let code = generateReferralCode(user.name);
  for (let i = 0; i < 5; i++) {
    const existing = await db.user.findUnique({ where: { referralCode: code } });
    if (!existing) break;
    code = generateReferralCode(user.name);
  }
  await db.user.update({ where: { id: user.id }, data: { referralCode: code } });
  return code;
}

export function buildReferralUrl(appUrl: string, code: string): string {
  return `${appUrl}/signup?ref=${encodeURIComponent(code)}`;
}

async function trackEvent(_name: string, _meta: Record<string, unknown>) {
  // Wrapped here for symmetry; uses analytics.ts in callers. Kept private to avoid import cycles.
}
