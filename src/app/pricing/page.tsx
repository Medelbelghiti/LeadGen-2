import Link from "next/link";
import { MarketingShell } from "@/components/MarketingShell";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/finance";
import { safeJsonParse } from "@/lib/utils";

export default async function PricingPage() {
  const plans = await db.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  return (
    <MarketingShell>
      <section className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-3xl md:text-4xl font-bold text-center">Plans</h1>
        <p className="text-center mt-3 text-charcoal-600 max-w-2xl mx-auto">Pick a plan to get started. Cancel anytime.</p>
        <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((p) => (
            <div key={p.id} className="card flex flex-col">
              <p className="font-bold text-xl">{p.name}</p>
              <p className="text-sm text-charcoal-500 mt-1">{p.description}</p>
              <p className="mt-4 text-3xl font-extrabold">
                {formatMoney(p.priceCents, p.currency)}
                {p.billingPeriod === "MONTHLY" && <span className="text-sm font-medium text-charcoal-500"> /mo</span>}
                {p.billingPeriod === "YEARLY" && <span className="text-sm font-medium text-charcoal-500"> /yr</span>}
              </p>
              <ul className="mt-4 text-sm space-y-1 flex-1">
                <li><strong>{p.maxVehicles}</strong> vehicle{p.maxVehicles > 1 ? "s" : ""}</li>
                <li><strong>{p.maxExpensesPerMonth.toLocaleString()}</strong> expenses / mo</li>
                <li><strong>{p.aiReceiptScansPerMonth}</strong> AI scans / mo</li>
                <li><strong>{p.aiConversationsPerMonth}</strong> AI chats / mo</li>
                <li><strong>{p.forecastHorizonMonths}-month</strong> forecast</li>
                <li>API: {p.enableApiAccess ? "Yes" : "No"}</li>
              </ul>
              <ul className="mt-3 text-xs text-charcoal-500 list-disc pl-4 space-y-1">
                {safeJsonParse<string[]>(p.features, []).slice(0, 4).map((f) => <li key={f}>{f}</li>)}
              </ul>
              <Link href={`/signup?plan=${p.key}`} className="btn btn-primary mt-6">{p.priceCents === 0 ? "Start free" : "Choose " + p.name}</Link>
            </div>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
