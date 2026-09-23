/* eslint-disable no-console */
// One-off helper to set Stripe Price IDs on existing plans.
// Usage: npx tsx prisma/set-stripe-prices.ts

import { PrismaClient } from "@prisma/client";

const PRICES: Array<{ key: string; priceId: string }> = [
  { key: "pro", priceId: "price_1UIBg8JxyDER2HXBGCIg8Zgt" },
  { key: "business", priceId: "price_1UIBh7JxyDER2HXBB5roYcNU" },
  { key: "lifetime", priceId: "price_1UIBhqJxyDER2HXB1VNrIp1r" },
];

async function main() {
  const prisma = new PrismaClient();
  for (const p of PRICES) {
    const plan = await prisma.plan.findUnique({ where: { key: p.key } });
    if (!plan) {
      console.warn(`! Plan "${p.key}" not found, skipping.`);
      continue;
    }
    const updated = await prisma.plan.update({
      where: { id: plan.id },
      data: { stripePriceId: p.priceId },
    });
    console.log(`✓ ${updated.name} (${updated.key}) → ${updated.stripePriceId}`);
  }
  await prisma.$disconnect();
  console.log("Stripe price IDs set.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
