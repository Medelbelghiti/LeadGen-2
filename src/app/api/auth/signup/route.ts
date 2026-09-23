import { NextResponse } from "next/server";
import { withErrorHandling, parseJson, ok } from "@/lib/http";
import { db } from "@/lib/db";
import {
  hashPassword,
  createSession,
  generateReferralCode,
} from "@/lib/auth";
import { SignupSchema } from "@/lib/schemas";
import { getTrialSettings } from "@/lib/settings";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp, randomToken } from "@/lib/utils";
import { sha256 } from "@/lib/utils";
import { sendEmail, tplWelcome, tplTrialStarted, tplEmailVerify } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { env } from "@/lib/env";
import { attributeAffiliateOnSignup, AFFILIATE_COOKIE_NAME } from "@/lib/affiliates";
import { trackEvent } from "@/lib/analytics";

export const POST = withErrorHandling(async (req) => {
  const ip = getClientIp(req);
  const rl = await checkRateLimit({ key: `signup:${ip}`, limit: 10, windowSeconds: 3600 });
  if (!rl.allowed) return NextResponse.json({ error: "Too many signups from this IP" }, { status: 429 });

  if (!(await isFeatureEnabled("registration"))) {
    return NextResponse.json({ error: "Registration is currently disabled" }, { status: 403 });
  }

  const body = await parseJson(req, SignupSchema);
  const existing = await db.user.findUnique({ where: { email: body.email.toLowerCase() } });
  if (existing) return NextResponse.json({ error: "An account already exists for this email" }, { status: 409 });

  const free = await db.plan.findFirst({ where: { key: "free", active: true } });

  const refCode = generateReferralCode(body.name);
  let finalRefCode = refCode;
  for (let i = 0; i < 5; i++) {
    const dupe = await db.user.findUnique({ where: { referralCode: finalRefCode } });
    if (!dupe) break;
    finalRefCode = generateReferralCode(body.name);
  }

  const trial = await getTrialSettings();
  const trialEndsAt =
    trial.trial_enabled && free && body.ref !== "skip"
      ? new Date(Date.now() + trial.trial_duration_days * 24 * 60 * 60 * 1000)
      : null;

  const user = await db.user.create({
    data: {
      email: body.email.toLowerCase(),
      passwordHash: await hashPassword(body.password),
      name: body.name ?? null,
      role: "USER",
      locale: body.locale ?? "en",
      planId: free?.id ?? null,
      referralCode: finalRefCode,
      trialEndsAt,
      signupIp: ip,
    },
  });

  // Referral attribution
  if (body.ref) {
    const referrer = await db.user.findUnique({ where: { referralCode: body.ref } });
    if (referrer && referrer.id !== user.id && !referrer.deletedAt) {
      await db.user.update({ where: { id: user.id }, data: { referredById: referrer.id } });
      await db.referral.create({
        data: {
          referrerId: referrer.id,
          referredUserId: user.id,
          status: trialEndsAt ? "TRIAL_STARTED" : "REGISTERED",
        },
      });
    }
  }

  // Affiliate attribution (cookie-based)
  const cookieHeader = req.headers.get("cookie") ?? "";
  const affMatch = cookieHeader.match(new RegExp(`${AFFILIATE_COOKIE_NAME}=([^;]+)`));
  if (affMatch) await attributeAffiliateOnSignup(user.id, decodeURIComponent(affMatch[1]));

  // Email verification token (only needed if not skipping for dev convenience)
  const verifyToken = randomToken(24);
  await db.verificationToken.create({
    data: {
      userId: user.id,
      tokenHash: sha256(verifyToken),
      type: "VERIFY_EMAIL",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const verifyUrl = `${env.appUrl}/verify-email?token=${verifyToken}`;
  await sendEmail({ ...tplEmailVerify(user.name, verifyUrl), to: user.email });
  await sendEmail({ ...tplWelcome(user.name, env.appUrl), to: user.email });
  if (trialEndsAt) {
    await sendEmail({
      ...tplTrialStarted(user.name, env.appUrl, trial.trial_duration_days),
      to: user.email,
    });
  }

  await createNotification({
    userId: user.id,
    type: "GENERAL",
    title: `Welcome to LeadGen 2.0`,
    body: "Verify your email to secure your account.",
    link: "/settings",
  });

  await createSession(user.id);
  await trackEvent("signup", { userId: user.id });
  if (trialEndsAt) await trackEvent("trial_started", { userId: user.id });

  return ok({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    requireEmailVerification: true,
    trialActive: Boolean(trialEndsAt),
  });
});
