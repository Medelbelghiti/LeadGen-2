import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeVehicleCost } from "@/lib/compute-cost";
import { formatMoney, computeDepreciation, projectCost, trueOwnershipCost } from "@/lib/finance";

export default async function ReportsPage() {
  const user = await requireUser();
  const vehicles = await db.vehicle.findMany({ where: { userId: user.id, archived: false }, orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }] });

  if (vehicles.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-charcoal-500 mt-2">Add a vehicle and expenses to generate a report.</p>
        <Link href="/garage/new" className="btn btn-accent mt-4 inline-flex">Add a vehicle</Link>
      </div>
    );
  }

  const v = vehicles[0];
  const summary = await computeVehicleCost(user.id, v.id);
  const currency = v.purchaseCurrency ?? "USD";
  const dep = v.purchasePriceCents ? computeDepreciation({
    purchasePriceCents: v.purchasePriceCents,
    purchaseDate: v.purchaseDate ?? new Date(),
    currentResaleCents: v.estimatedResaleCents,
  }) : null;
  const f12 = projectCost(summary, 12);
  const trueCost = v.purchasePriceCents ? trueOwnershipCost(summary, {
    purchasePriceCents: v.purchasePriceCents,
    purchaseDate: v.purchaseDate ?? new Date(),
    estimatedResaleCents: v.estimatedResaleCents,
    monthlyFixedCents: 10000,
  }, 36) : null;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Cost of Ownership Report</h1>
      <p className="text-sm text-charcoal-500">
        {v.year} {v.brand} {v.model} · Generated {new Date().toLocaleDateString()}
      </p>

      <section className="card">
        <p className="font-semibold">Summary</p>
        <div className="grid md:grid-cols-3 gap-3 mt-3 text-sm">
          <Row label="Months of data" value={String(summary.monthsOfData)} />
          <Row label="Total recorded spending" value={formatMoney(summary.totalSpent, currency)} />
          <Row label="Distance driven" value={summary.totalDistance ? summary.totalDistance.toLocaleString() + " " + (v.currentMileageUnit ?? "km") : "Not enough data"} />
          <Row label="Monthly average" value={formatMoney(summary.monthlyAverage, currency)} />
          <Row label="Estimated annual cost" value={formatMoney(summary.annualEstimate, currency)} />
          <Row label={`Cost per ${v.currentMileageUnit ?? "km"}`} value={summary.costPerKm != null ? formatMoney(summary.costPerKm, currency) : "Not enough data"} />
        </div>
        <p className="text-xs text-charcoal-500 mt-3">Numbers labeled ACTUAL are derived from your recorded expenses and fuel entries.</p>
      </section>

      <section className="card">
        <p className="font-semibold">By category</p>
        <table className="basic mt-3">
          <thead><tr><th>Category</th><th className="text-right">Amount</th><th className="text-right">%</th></tr></thead>
          <tbody>
            {summary.breakdown.map((b) => (
              <tr key={b.category}><td className="capitalize">{b.category}</td><td className="text-right">{formatMoney(b.amount, currency)}</td><td className="text-right">{b.percent}%</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <p className="font-semibold">Forecast (next 12 months)</p>
        <p className="text-3xl font-extrabold mt-2 text-emerald-700">{formatMoney(f12.total, currency)}</p>
        <ul className="text-xs text-charcoal-500 mt-3 space-y-1">
          {f12.assumptions.map((a, i) => <li key={i}>• {a}</li>)}
        </ul>
      </section>

      {dep && (
        <section className="card">
          <p className="font-semibold">Depreciation (ESTIMATE)</p>
          <p className="text-sm mt-2">Method: <strong>{dep.method}</strong></p>
          <p className="text-sm">Total estimated depreciation: <strong>{formatMoney(dep.totalDepreciationCents, currency)}</strong></p>
          <p className="text-xs text-charcoal-500 mt-2">{dep.note}</p>
        </section>
      )}

      {trueCost && (
        <section className="card">
          <p className="font-semibold">True cost of ownership (3-year horizon)</p>
          <p className="text-3xl font-extrabold mt-2">{formatMoney(trueCost.total, currency)}</p>
          <ul className="text-xs text-charcoal-500 mt-3 space-y-1">
            {trueCost.breakdown.map((b) => (
              <li key={b.label}><span className="badge badge-info mr-2">{b.source}</span>{b.label}: <strong>{formatMoney(b.cents, currency)}</strong></li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs text-charcoal-500">
        All financial outputs in this report are either ACTUAL (from your recorded data), ESTIMATE (calculated from assumptions), or FORECAST (projection into the future).
        AutoEco is a financial analysis tool — not a mechanical or safety diagnostic service.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-charcoal-500">{label}</p>
      <p className="font-semibold mt-0.5">{value}</p>
    </div>
  );
}
