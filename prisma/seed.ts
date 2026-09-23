/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ---- Feature flags --------------------------------------------------------
  const flags: Array<[string, boolean, string]> = [
    ["ai_enrichment", false, "Optional AI enrichment layer"],
    ["google_provider", true, "Google Places provider"],
    ["osm_provider", true, "OpenStreetMap provider"],
    ["demo_provider", true, "Demo data provider (synthetic, labeled)"],
    ["api_access", true, "Customer API access"],
    ["referral_system", true, "Referral reward program"],
    ["affiliate_system", true, "Affiliate program"],
    ["lifetime_plan", true, "Lifetime one-time plan"],
    ["team_accounts", true, "Business plan team accounts"],
    ["registration", true, "Allow new signups"],
  ];
  for (const [key, enabled, description] of flags) {
    await prisma.featureFlag.upsert({
      where: { key },
      create: { key, enabled, description },
      update: { enabled, description },
    });
  }

  // ---- Settings -------------------------------------------------------------
  const settings: Array<[string, string]> = [
    ["trial_enabled", "true"],
    ["trial_duration_days", "7"],
    ["trial_lead_limit", "100"],
    ["trial_export_limit", "50"],
    ["trial_search_limit", "20"],

    ["referral_enabled", "true"],
    ["referral_reward_type", "LEADS_BONUS"],
    ["referral_reward_value", "100"],
    ["referral_reward_plan_key", "pro"],
    ["referral_commission_percent", "10"],

    ["affiliate_enabled", "true"],
    ["commission_percentage", "20"],
    ["cookie_duration_days", "30"],
    ["minimum_payout_cents", "5000"],
    ["payout_method", "paypal"],

    ["max_requests_per_search", "20"],
    ["max_results_hard_cap", "10000"],
    ["daily_provider_request_limit", "2000"],
    ["monthly_provider_request_limit", "20000"],
  ];
  for (const [key, value] of settings) {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }

  // ---- Plans ---------------------------------------------------------------
  const plans = [
    {
      key: "free",
      name: "Free",
      description: "Get started and explore the platform.",
      priceCents: 0,
      billingPeriod: "FREE",
      monthlyLeadLimit: 50,
      monthlySearchLimit: 10,
      dailySearchLimit: 3,
      exportLimit: 25,
      maxResultsPerSearch: 25,
      providers: ["demo"],
      features: ["Demo provider data", "Basic search", "CSV export"],
      teamMembersLimit: 1,
      apiAccess: false,
      apiMonthlyQuota: 0,
      sortOrder: 0,
    },
    {
      key: "pro",
      name: "Pro",
      description: "For freelancers and small teams discovering leads.",
      priceCents: 4900,
      billingPeriod: "MONTHLY",
      monthlyLeadLimit: 5000,
      monthlySearchLimit: 200,
      dailySearchLimit: 30,
      exportLimit: 5000,
      maxResultsPerSearch: 500,
      providers: ["demo", "openstreetmap", "google"],
      features: ["Multi-provider search", "CSV / XLSX / JSON export", "Lead CRM", "Referral rewards"],
      teamMembersLimit: 3,
      apiAccess: true,
      apiMonthlyQuota: 1000,
      sortOrder: 1,
    },
    {
      key: "business",
      name: "Business",
      description: "High-volume teams and agencies.",
      priceCents: 14900,
      billingPeriod: "MONTHLY",
      monthlyLeadLimit: 25000,
      monthlySearchLimit: 1000,
      dailySearchLimit: 100,
      exportLimit: 50000,
      maxResultsPerSearch: 2000,
      providers: ["demo", "openstreetmap", "google"],
      features: [
        "Everything in Pro",
        "Priority provider quotas",
        "Team accounts",
        "Dedicated support",
      ],
      teamMembersLimit: 10,
      apiAccess: true,
      apiMonthlyQuota: 10000,
      sortOrder: 2,
    },
    {
      key: "lifetime",
      name: "Lifetime",
      description: "One-time payment. Subject to fair-use limits.",
      priceCents: 49900,
      billingPeriod: "LIFETIME",
      monthlyLeadLimit: 500000,
      monthlySearchLimit: 50000,
      dailySearchLimit: 500,
      exportLimit: 500000,
      maxResultsPerSearch: 5000,
      providers: ["demo", "openstreetmap", "google"],
      features: ["One-time payment", "No recurring billing", "All current and future providers", "Priority support"],
      teamMembersLimit: 5,
      apiAccess: true,
      apiMonthlyQuota: 25000,
      sortOrder: 3,
    },
  ] as const;

  for (const p of plans) {
    await prisma.plan.upsert({
      where: { key: p.key },
      create: {
        ...p,
        providers: JSON.stringify(p.providers),
        features: JSON.stringify(p.features),
      },
      update: {
        name: p.name,
        description: p.description,
        priceCents: p.priceCents,
        billingPeriod: p.billingPeriod,
        monthlyLeadLimit: p.monthlyLeadLimit,
        monthlySearchLimit: p.monthlySearchLimit,
        dailySearchLimit: p.dailySearchLimit,
        exportLimit: p.exportLimit,
        maxResultsPerSearch: p.maxResultsPerSearch,
        providers: JSON.stringify(p.providers),
        features: JSON.stringify(p.features),
        teamMembersLimit: p.teamMembersLimit,
        apiAccess: p.apiAccess,
        apiMonthlyQuota: p.apiMonthlyQuota,
        sortOrder: p.sortOrder,
      },
    });
  }

  // ---- Demo coupon ---------------------------------------------------------
  await prisma.coupon.upsert({
    where: { code: "EARLYBIRD" },
    create: {
      code: "EARLYBIRD",
      type: "PERCENT",
      value: 30,
      duration: "FIRST_MONTH",
      firstPurchaseOnly: false,
      maxRedemptions: 100,
      perUserLimit: 1,
      planKeys: JSON.stringify(["pro", "business"]),
      active: true,
    },
    update: {},
  });

  // ---- Admin user ---------------------------------------------------------
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "change-me-admin";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail.toLowerCase() } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const free = await prisma.plan.findUnique({ where: { key: "free" } });
    await prisma.user.create({
      data: {
        email: adminEmail.toLowerCase(),
        passwordHash,
        name: "Administrator",
        role: "ADMIN",
        emailVerifiedAt: new Date(),
        referralCode: "LEADGEN-ADM001",
        planId: free?.id ?? null,
      },
    });
    console.log(`✓ Seed admin user created: ${adminEmail}`);
    console.log(`  Password: ${adminPassword} (change immediately in production)`);
  } else {
    console.log(`✓ Seed admin already exists: ${adminEmail}`);
  }

  // ---- Demo regular user ---------------------------------------------------
  const demoUserEmail = "demo@example.com";
  const existingDemo = await prisma.user.findUnique({ where: { email: demoUserEmail } });
  if (!existingDemo) {
    const passwordHash = await bcrypt.hash("demo-password", 12);
    const pro = await prisma.plan.findUnique({ where: { key: "pro" } });
    await prisma.user.create({
      data: {
        email: demoUserEmail,
        passwordHash,
        name: "Demo User",
        emailVerifiedAt: new Date(),
        referralCode: "LEADGEN-DEMO01",
        planId: pro?.id ?? null,
      },
    });
    console.log(`✓ Demo user created: ${demoUserEmail} / demo-password`);
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
