import Link from "next/link";
import { Car, Fuel, Receipt, LineChart, Sparkles, ChevronRight, FileText, Camera } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEntitlements } from "@/lib/plans";
import { getMonthlyUsage } from "@/lib/usage";
import { computeVehicleCost } from "@/lib/compute-cost";
import { formatMoney, type CostSummary } from "@/lib/finance";

export default async function DashboardPage() {
  const user = await requireUser();
  const ent = await getEntitlements(user);
  const usage = await getMonthlyUsage(user.id);

  const vehicles = await db.vehicle.findMany({
    where: { userId: user.id, archived: false },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
  });

  const primary = vehicles.find((v) => v.isPrimary) ?? vehicles[0];

  let summary = null as CostSummary | null;
  let mixedCurrency: string[] | null = null;
  if (primary) {
    const result = await computeVehicleCost(user.id, primary.id);
    if (result.ok) summary = result.summary;
    else if (result.error === "mixed_currency") mixedCurrency = result.currencies;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Welcome back{user.name ? `, ${user.name}` : ""}</h1>
          <p className="text-sm text-charcoal-500">
            Plan: <strong>{ent.planName}</strong>
            {ent.isTrial && ent.trialEndsAt && ` · trial ends ${ent.trialEndsAt.toISOString().slice(0, 10)}`}
            {ent.currentPeriodEnd && !ent.isTrial && ` · renews ${ent.currentPeriodEnd.toISOString().slice(0, 10)}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/expenses/new" className="btn btn-primary"><Receipt className="w-4 h-4" /> Add expense</Link>
          <Link href="/garage/new" className="btn btn-accent"><Car className="w-4 h-4" /> Add vehicle</Link>
        </div>
      </div>

      {vehicles.length === 0 ? (
        <div className="mt-8 card text-center py-16">
          <Car className="w-12 h-12 text-charcoal-300 mx-auto" />
          <p className="mt-3 font-semibold">Your garage is empty</p>
          <p className="text-sm text-charcoal-500 mt-1">Add your first car to start understanding what it really costs.</p>
          <Link href="/garage/new" className="btn btn-accent mt-4 inline-flex">Add your first car</Link>
        </div>
      ) : (
        <>
          {mixedCurrency && (
            <div className="mt-6 card border-amber-300 bg-amber-50">
              <p className="font-semibold text-amber-800">Mixed-currency data detected</p>
              <p className="text-sm text-amber-700 mt-1">
                Your expenses and fuel entries use multiple currencies: {Array.from(new Set(mixedCurrency)).join(", ")}.
                AutoEco cannot add amounts across currencies. Use a single currency for your {primary?.nickname ?? `${primary?.year ?? ""} ${primary?.brand ?? ""} ${primary?.model ?? ""}`} entries to see totals.
              </p>
            </div>
          )}

          <div className="mt-6 grid md:grid-cols-4 gap-3">
            <KPI label="Vehicles" value={vehicles.length.toString()} />
            <KPI label="Expenses this month" value={usage.expenses.toString()} sub={`of ${ent.maxExpensesPerMonth}`} />
            <KPI label="AI chats used" value={usage.aiConversations.toString()} sub={`of ${ent.aiConversationsPerMonth}`} />
            <KPI label="Forecast horizon" value={`${ent.forecastHorizonMonths} mo`} />
          </div>

          {primary && summary && (
            <section className="mt-6 card">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <p className="label">Primary vehicle</p>
                  <h2 className="text-xl font-bold mt-1">{primary.nickname ?? `${primary.year} ${primary.brand} ${primary.model}`}</h2>
                  <p className="text-xs text-charcoal-500">{primary.fuelType} · {primary.transmission ?? "—"} · {primary.fuelEconomyText ?? "—"}</p>
                </div>
                <Link href={`/garage/${primary.id}`} className="btn btn-secondary text-sm">View vehicle <ChevronRight className="w-4 h-4" /></Link>
              </div>
              <div className="mt-5 grid md:grid-cols-4 gap-3">
                <KPI label="Monthly cost" value={formatMoney(summary.monthlyAverage, summary.baseCurrency)} accent />
                <KPI label="Cost / km" value={summary.costPerKm != null ? formatMoney(summary.costPerKm, summary.baseCurrency) : "—"} />
                <KPI label="Total spent" value={formatMoney(summary.totalSpent, summary.baseCurrency)} />
                <KPI label="Annual estimate" value={formatMoney(summary.annualEstimate, summary.baseCurrency)} />
              </div>
              {summary.breakdown.length > 0 && (
                <div className="mt-5">
                  <p className="label mb-2">Where the money goes</p>
                  {summary.breakdown.slice(0, 6).map((b) => (
                    <div key={b.category} className="mb-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="capitalize">{b.category}</span>
                        <span className="text-charcoal-500">{formatMoney(b.amount, summary.baseCurrency)} · {b.percent}%</span>
                      </div>
                      <div className="progress"><span className="bg-emerald-500" style={{ width: `${b.percent}%` }} /></div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="badge badge-info">Actual: {summary.monthsOfData} months</span>
                <span className="badge badge-info">Distance: {summary.totalDistance?.toLocaleString() ?? "—"} {primary.currentMileageUnit ?? "km"}</span>
                {summary.missingDistance && <span className="badge badge-warn">No distance data</span>}
              </div>
            </section>
          )}

          <div className="mt-6 grid md:grid-cols-3 lg:grid-cols-5 gap-3">
            <QuickAction href="/fuel" icon={Fuel} title="Fuel" desc="Track consumption" />
            <QuickAction href="/receipts" icon={Camera} title="Receipts" desc="Scan a receipt" />
            <QuickAction href="/insights" icon={LineChart} title="Insights" desc="Trends and forecasts" />
            <QuickAction href="/assistant" icon={Sparkles} title="Ask your car" desc="AI grounded in your data" />
            <QuickAction href="/reports" icon={FileText} title="Reports" desc="Cost of ownership" />
          </div>
        </>
      )}
    </div>
  );
}

function KPI({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`card ${accent ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200/60 dark:border-emerald-700/40" : ""}`}>
      <p className="label">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent ? "text-emerald-700 dark:text-emerald-300" : ""}`}>{value}</p>
      {sub && <p className="text-xs text-charcoal-500 mt-1">{sub}</p>}
    </div>
  );
}

function QuickAction({ href, icon: Icon, title, desc }: { href: string; icon: any; title: string; desc: string }) {
  return (
    <Link href={href} className="card hover:shadow-elevated transition">
      <Icon className="w-5 h-5 text-emerald-600" />
      <p className="font-semibold mt-2">{title}</p>
      <p className="text-sm text-charcoal-500">{desc}</p>
    </Link>
  );
}
