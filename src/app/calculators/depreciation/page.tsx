import { MarketingShell } from "@/components/MarketingShell";
import Link from "next/link";

export const metadata = { title: "Car Depreciation Calculator | AutoEco", description: "Estimate how much your car will depreciate over time." };

export default function DepreciationPage() {
  return (
    <MarketingShell>
      <section className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl md:text-4xl font-bold">Depreciation Calculator</h1>
        <p className="text-charcoal-600 mt-2">Straight-line estimate: ~20% per year. Real depreciation varies by model, mileage, and market.</p>
        <DepCalculator />
        <p className="text-xs text-charcoal-500 mt-6">Estimate only. Track your real depreciation in <Link className="underline" href="/signup">AutoEco</Link>.</p>
      </section>
    </MarketingShell>
  );
}

import { Client } from "./Calculator";
const DepCalculator = Client;
