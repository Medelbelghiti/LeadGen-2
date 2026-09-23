/* eslint-disable no-console */
// Enable OpenStreetMap provider on Pro, Business, and Lifetime plans.
// Run once: npx tsx prisma/enable-osm-providers.ts

import { PrismaClient } from "@prisma/client";

const PLAN_KEYS = ["pro", "business", "lifetime"];

async function main() {
  const prisma = new PrismaClient();
  for (const key of PLAN_KEYS) {
    const plan = await prisma.plan.findUnique({ where: { key } });
    if (!plan) {
      console.warn(`! Plan "${key}" not found, skipping.`);
      continue;
    }
    const updated = await prisma.plan.update({
      where: { id: plan.id },
      data: { providers: JSON.stringify(["openstreetmap", "demo"]) },
    });
    console.log(`✓ ${updated.name} → providers: ${updated.providers}`);
  }
  await prisma.$disconnect();
  console.log("OpenStreetMap enabled on Pro/Business/Lifetime.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
