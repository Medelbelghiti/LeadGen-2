import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney, projectCost } from "@/lib/finance";
import { computeVehicleCost } from "@/lib/compute-cost";

export default async function InsightsPage() {
  const user = await requireUser();
  const vehicles = await db.vehicle.findMany({ where: { userId: user.id, archived: false } });
  if (vehicles.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold">Insights</h1>
        <p className="text-sm text-charcoal-500 mt-2">No vehicles yet.</p>
        <Link href="/garage/new" className="btn btn-accent mt-4 inline-flex">Add a vehicle</Link>
      </div>
    );
  }
  const data = await Promise.all(vehicles.map(async (v) => {
    const summary = await computeVehicleCost(user.id, v.id);
    const f12 = projectCost(summary, 12);
    const expenses = await db.expense.findMany({ where: { vehicleId: v.id }, select: { date: true, amountCents: true, currency: true }, orderBy: { date: "asc" } });
    return { v, summary, f12, expenses };
  }));
  const primary = data[0];
  const monthly: Record<string, number> = {};
  for (const e of primary.expenses) {
    const key = e.date.toISOString().slice(0, 7);
    monthly[key] = (monthly[key] ?? 0) + e.amountCents;
  }
  const sortedMonths = Object.keys(monthly).sort();
  const max = Math.max(1, ...Object.values(monthly));
  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold">Insights</h1>
      <p className="text-sm text-charcoal-500">Spending trends and forecasts across your vehicles.</p>
      <section className="card mt-6">
        <p className="font-semibold">Monthly spending — {primary.v.nickname ?? `${primary.v.year} ${primary.v.brand} ${primary.v.model}`}</p>
        {sortedMonths.length === 0 ? (
          <p className="text-sm text-charcoal-500 mt-2">Not enough data yet. Add expenses to see trends.</p>
        ) : (
          <div className="mt-4 flex items-end gap-1 h-32">
            {sortedMonths.map((m) => {
              const h = Math.round((monthly[m] / max) * 100);
              return (
                <div key={m} className="flex-1 flex flex-col items-center gap-1" title={`${m}: ${formatMoney(monthly[m])}`}>
                  <div className="w-full bg-emerald-500 rounded-t" style={{ height: `${h}%` }} />
                  <span className="text-[10px] text-charcoal-500 -rotate-45 origin-top-left">{m.slice(2)}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>
      <section className="card mt-6">
        <p className="font-semibold">Forecast vs actual (12 months)</p>
        <ul className="mt-3 space-y-1 text-sm">
          <li>Monthly average: <strong>{formatMoney(primary.summary.monthlyAverage, primary.v.purchaseCurrency ?? "USD")}</strong></li>
          <li>12-month forecast (flat): <strong>{formatMoney(primary.f12.total, primary.v.purchaseCurrency ?? "USD")}</strong></li>
          <li>Distance: <strong>{primary.summary.totalDistance?.toLocaleString() ?? "—"} {primary.v.currentMileageUnit ?? "km"}</strong></li>
          <li>Cost/km: <strong>{primary.summary.costPerKm != null ? formatMoney(primary.summary.costPerKm, primary.v.purchaseCurrency ?? "USD") : "—"}</strong></li>
        </ul>
        <p className="text-xs text-charcoal-500 mt-3">Assumption: {primary.f12.assumptions.join(" · ")}</p>
      </section>
      <section className="card mt-6">
        <p className="font-semibold">All vehicles</p>
        <table className="basic mt-3">
          <thead><tr><th>Vehicle</th><th>Monthly</th><th>Cost/km</th><th>Total spent</th><th>Annual est.</th></tr></thead>
          <tbody>
            {data.map(({ v, summary }) => (
              <tr key={v.id}>
                <td><Link className="underline" href={`/garage/${v.id}`}>{v.nickname ?? `${v.year} ${v.brand} ${v.model}`}</Link></td>
                <td>{formatMoney(summary.monthlyAverage, v.purchaseCurrency ?? "USD")}</td>
                <td>{summary.costPerKm != null ? formatMoney(summary.costPerKm, v.purchaseCurrency ?? "USD") : "—"}</td>
                <td>{formatMoney(summary.totalSpent, v.purchaseCurrency ?? "USD")}</td>
                <td>{formatMoney(summary.annualEstimate, v.purchaseCurrency ?? "USD")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
