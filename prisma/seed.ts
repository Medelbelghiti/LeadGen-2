/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const flags: Array<[string, boolean, string]> = [
    ["ai_receipt_scan", true, "OCR receipt scanning"],
    ["ai_conversations", true, "AI 'Ask my car' chat"],
    ["ai_enrichment", false, "Optional AI enrichment"],
    ["registration", true, "Allow new signups"],
    ["shareable_reports", true, "Public share links"],
    ["advanced_scenarios", true, "Repair vs Replace simulator"],
  ];
  for (const [key, enabled, description] of flags) {
    await prisma.featureFlag.upsert({
      where: { key },
      create: { key, enabled, description },
      update: { enabled, description },
    });
  }

  const settings: Array<[string, string]> = [
    ["trial_enabled", "true"],
    ["trial_duration_days", "14"],
    ["trial_lead_limit", "200"],
    ["default_currency", "USD"],
    ["default_distance_unit", "km"],
    ["default_fuel_unit", "L_PER_100KM"],
    ["affiliate_enabled", "false"],
    ["affiliate_commission_percent", "20"],
    ["affiliate_cookie_days", "30"],
    ["affiliate_min_payout_cents", "5000"],
    ["affiliate_payout_method", "paypal"],
    ["referral_enabled", "false"],
    ["referral_reward_type", "PLAN_MONTH"],
    ["referral_reward_plan_key", "pro"],
    ["referral_reward_value", "1"],
  ];
  for (const [key, value] of settings) {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }

  const plans = [
    { key: "free", name: "Free", description: "Track one vehicle. Get the basics.", priceCents: 0, billingPeriod: "FREE", maxVehicles: 1, maxExpensesPerMonth: 50, aiReceiptScansPerMonth: 0, aiConversationsPerMonth: 0, reportRetentionDays: 30, forecastHorizonMonths: 12, enableAdvancedScenarios: false, enableShareableReports: false, enableFamilySharing: false, enableApiAccess: false, features: ["1 vehicle", "Expense tracking", "Basic dashboard", "12-month forecast"], sortOrder: 0 },
    { key: "pro", name: "Pro", description: "Multi-vehicle tracking, AI, advanced forecasts.", priceCents: 699, billingPeriod: "MONTHLY", maxVehicles: 5, maxExpensesPerMonth: 1000, aiReceiptScansPerMonth: 50, aiConversationsPerMonth: 100, reportRetentionDays: 365, forecastHorizonMonths: 60, enableAdvancedScenarios: true, enableShareableReports: true, enableFamilySharing: false, enableApiAccess: false, features: ["Up to 5 vehicles", "AI receipt scan", "Financial Twin", "60-month forecast", "What-If simulator", "Shareable reports"], sortOrder: 1 },
    { key: "family", name: "Family", description: "For households with several drivers and vehicles.", priceCents: 1299, billingPeriod: "MONTHLY", maxVehicles: 12, maxExpensesPerMonth: 2500, aiReceiptScansPerMonth: 200, aiConversationsPerMonth: 300, reportRetentionDays: 730, forecastHorizonMonths: 60, enableAdvancedScenarios: true, enableShareableReports: true, enableFamilySharing: true, enableApiAccess: false, features: ["Up to 12 vehicles", "Everything in Pro", "Family sharing", "Priority support"], sortOrder: 2 },
    { key: "pro_plus", name: "Pro Plus", description: "Power users: API access, unlimited everything.", priceCents: 1999, billingPeriod: "MONTHLY", maxVehicles: 50, maxExpensesPerMonth: 10000, aiReceiptScansPerMonth: 1000, aiConversationsPerMonth: 1000, reportRetentionDays: 3650, forecastHorizonMonths: 120, enableAdvancedScenarios: true, enableShareableReports: true, enableFamilySharing: true, enableApiAccess: true, features: ["Up to 50 vehicles", "Everything in Family", "API access", "10-year forecasts", "Premium reports"], sortOrder: 3 },
  ];

  for (const p of plans) {
    await prisma.plan.upsert({
      where: { key: p.key },
      create: { ...p, features: JSON.stringify(p.features) },
      update: {
        name: p.name, description: p.description, priceCents: p.priceCents, billingPeriod: p.billingPeriod,
        maxVehicles: p.maxVehicles, maxExpensesPerMonth: p.maxExpensesPerMonth,
        aiReceiptScansPerMonth: p.aiReceiptScansPerMonth, aiConversationsPerMonth: p.aiConversationsPerMonth,
        reportRetentionDays: p.reportRetentionDays, forecastHorizonMonths: p.forecastHorizonMonths,
        enableAdvancedScenarios: p.enableAdvancedScenarios, enableShareableReports: p.enableShareableReports,
        enableFamilySharing: p.enableFamilySharing, enableApiAccess: p.enableApiAccess,
        features: JSON.stringify(p.features), sortOrder: p.sortOrder,
      },
    });
  }

  const samples = [
    { brand: "Toyota", model: "Corolla", yearFrom: 2018, yearTo: 2023, fuelType: "gasoline", transmission: "CVT", fuelEconomyText: "6.0 L/100km" },
    { brand: "Toyota", model: "RAV4", yearFrom: 2019, yearTo: 2024, fuelType: "hybrid", transmission: "CVT", fuelEconomyText: "5.8 L/100km" },
    { brand: "Honda", model: "Civic", yearFrom: 2016, yearTo: 2024, fuelType: "gasoline", fuelEconomyText: "6.4 L/100km" },
    { brand: "BMW", model: "X5", yearFrom: 2019, yearTo: 2024, fuelType: "diesel", fuelEconomyText: "7.5 L/100km" },
    { brand: "Tesla", model: "Model 3", yearFrom: 2019, yearTo: 2024, fuelType: "ev", fuelEconomyText: "15 kWh/100km", batteryCapacityKwh: 60 },
    { brand: "Renault", model: "Clio", yearFrom: 2019, yearTo: 2024, fuelType: "gasoline", fuelEconomyText: "5.2 L/100km" },
    { brand: "Peugeot", model: "208", yearFrom: 2019, yearTo: 2024, fuelType: "gasoline", fuelEconomyText: "4.8 L/100km" },
    { brand: "Dacia", model: "Duster", yearFrom: 2018, yearTo: 2024, fuelType: "gasoline", fuelEconomyText: "7.1 L/100km" },
    { brand: "Hyundai", model: "Tucson", yearFrom: 2020, yearTo: 2024, fuelType: "hybrid", fuelEconomyText: "5.6 L/100km" },
    { brand: "Volkswagen", model: "Golf", yearFrom: 2017, yearTo: 2024, fuelType: "gasoline", fuelEconomyText: "5.5 L/100km" },
  ];
  for (const s of samples) {
    const exists = await prisma.vehicleCatalogEntry.findFirst({ where: { brand: s.brand, model: s.model } });
    if (!exists) await prisma.vehicleCatalogEntry.create({ data: { ...s, verified: false, isDemo: false } });
  }

  const adminEmail = (process.env.SEED_ADMIN_EMAIL || "admin@autoeco.app").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "change-me-admin";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const free = await prisma.plan.findUnique({ where: { key: "free" } });
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 12),
        name: "Administrator", role: "ADMIN", emailVerifiedAt: new Date(),
        planId: free?.id ?? null, currency: "USD", distanceUnit: "km", fuelUnit: "L_PER_100KM",
      },
    });
    console.log(`+ Admin: ${adminEmail} / ${adminPassword}`);
  }

  const demoEmail = "demo@autoeco.app";
  const existingDemo = await prisma.user.findUnique({ where: { email: demoEmail } });
  if (!existingDemo) {
    const free = await prisma.plan.findUnique({ where: { key: "free" } });
    const demoUser = await prisma.user.create({
      data: {
        email: demoEmail,
        passwordHash: await bcrypt.hash("demo-password", 12),
        name: "Demo User", emailVerifiedAt: new Date(),
        planId: free?.id ?? null, currency: "USD", distanceUnit: "km", fuelUnit: "L_PER_100KM",
      },
    });
    const vehicle = await prisma.vehicle.create({
      data: {
        userId: demoUser.id, brand: "Toyota", model: "Corolla", year: 2021,
        fuelType: "gasoline", transmission: "CVT", fuelEconomyText: "6.0 L/100km",
        purchaseDate: new Date("2022-03-15"), purchasePriceCents: 2200000, purchaseCurrency: "USD",
        currentMileage: 32000, currentMileageUnit: "km",
        isPrimary: true, isDemo: true,
      },
    });
    const now = new Date();
    const months = [6, 5, 4, 3, 2, 1];
    const cats: Array<["maintenance" | "insurance" | "parking" | "tolls" | "other", number]> = [
      ["maintenance", 12000], ["insurance", 9000], ["parking", 3500], ["tolls", 2000], ["other", 5500],
    ];
    for (let i = 0; i < months.length; i++) {
      const m = months[i];
      const d = new Date(now);
      d.setMonth(d.getMonth() - m);
      await prisma.fuelEntry.create({
        data: {
          userId: demoUser.id, vehicleId: vehicle.id, date: d,
          amountCents: 5500 + Math.floor(Math.random() * 1500), currency: "USD",
          liters: 38 + Math.random() * 6,           pricePerUnit: 1.45 + Math.random() * 0.2,
          mileage: 30000 - m * 1100 + Math.floor(Math.random() * 200), mileageUnit: "km",
          fullTank: true, station: "Sample Station",
          consumption: 6.2 + (Math.random() - 0.5) * 0.6,
          isDemo: true,
        },
      });
      const pick = cats[i % cats.length];
      await prisma.expense.create({
        data: {
          userId: demoUser.id, vehicleId: vehicle.id, category: pick[0],
          amountCents: pick[1] + Math.floor(Math.random() * 1000), currency: "USD",
          date: d, merchant: `Sample ${pick[0]}`, isDemo: true,
        },
      });
    }
    console.log(`+ Demo user: ${demoEmail} / demo-password (sample data)`);
  }

  console.log("AutoEco seed complete.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
