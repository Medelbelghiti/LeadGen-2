import Link from "next/link";
import { MarketingShell } from "@/components/MarketingShell";
import { CarCostCalculator } from "./Calculator";

export const metadata = { title: "Car Cost Calculator | AutoEco", description: "Estimate the true monthly and annual cost of owning a car." };

export default function CarCostPage() {
  return (
    <MarketingShell>
      <section className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl md:text-4xl font-bold">Car Cost Calculator</h1>
        <p className="text-charcoal-600 mt-2">Quick estimate based on typical ownership costs. Results are estimates, not guarantees.</p>
        <CarCostCalculator />
        <div className="card mt-6">
          <p className="font-semibold">Want actual tracking?</p>
          <p className="text-sm text-charcoal-500 mt-1">AutoEco computes your real cost from your actual expenses.</p>
          <Link href="/signup" className="btn btn-accent mt-3">Create free account</Link>
        </div>
      </section>
    </MarketingShell>
  );
}
