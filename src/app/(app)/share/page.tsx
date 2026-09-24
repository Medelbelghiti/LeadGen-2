import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { computeVehicleCost } from "@/lib/compute-cost";
import { formatMoney, computeDepreciation, projectCost } from "@/lib/finance";

export default async function SharePage({ searchParams }: { searchParams: { token?: string } }) {
  if (!searchParams.token) redirect("/dashboard");
  return <PublicReport token={searchParams.token} />;
}

async function PublicReport({ token }: { token: string }) {
  const link = await db.shareLink.findUnique({ where: { token } });
  if (!link || link.revokedAt) return <Error msg="This share link has been revoked." />;
  if (link.expiresAt && link.expiresAt < new Date()) return <Error msg="This share link has expired." />;

  const vehicles = await db.vehicle.findMany({
    where: { userId: link.userId, archived: false },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
  });
  const primary = vehicles[0];
  if (!primary) return <Error msg="No vehicle data available." />;

  const result = await computeVehicleCost(link.userId, primary.id);
  if (!result.ok) {
    return <Error msg="Owner data is temporarily unavailable or contains mixed currencies." />;
  }
  const summary = result.summary;
  const currency = primary.purchaseCurrency ?? "USD";
  const dep = primary.purchasePriceCents ? computeDepreciation({
    purchasePriceCents: primary.purchasePriceCents,
    purchaseDate: primary.purchaseDate ?? new Date(),
    currentResaleCents: primary.estimatedResaleCents,
  }) : null;
  const f12 = projectCost(summary, 12);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <p className="text-xs text-charcoal-500">Public share — no personal information exposed.</p>
      <h1 className="text-2xl font-bold mt-2">Cost of Ownership Report</h1>
      <p className="text-sm text-charcoal-500">{primary.year} {primary.brand} {primary.model}</p>

      <section className="card mt-6">
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          <Row label="Months of data" value={String(summary.monthsOfData)} />
          <Row label="Total spending" value={formatMoney(summary.totalSpent, currency)} />
          <Row label="Monthly average" value={formatMoney(summary.monthlyAverage, currency)} accent />
          <Row label="Annual estimate" value={formatMoney(summary.annualEstimate, currency)} />
        </div>
      </section>

      <section className="card mt-4">
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

      <section className="card mt-4">
        <p className="font-semibold">12-month forecast (flat, FORECAST)</p>
        <p className="text-3xl font-extrabold mt-2 text-emerald-700">{formatMoney(f12.total, currency)}</p>
        <ul className="text-xs text-charcoal-500 mt-3 space-y-1">
          {f12.assumptions.map((a, i) => <li key={i}>- {a}</li>)}
        </ul>
      </section>

      {dep && (
        <section className="card mt-4">
          <p className="font-semibold">Depreciation (ESTIMATE)</p>
          <p className="text-sm mt-2">Method: <strong>{dep.method}</strong></p>
          <p className="text-sm">Total estimated depreciation: <strong>{formatMoney(dep.totalDepreciationCents, currency)}</strong></p>
        </section>
      )}

      <p className="text-xs text-charcoal-500 mt-6">AutoEco provides financial estimates, not vehicle safety or mechanical diagnosis.</p>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-xs text-charcoal-500">{label}</p>
      <p className={"font-semibold mt-0.5 " + (accent ? "text-emerald-700" : "")}>{value}</p>
    </div>
  );
}

function Error({ msg }: { msg: string }) {
  return (
    <div className="max-w-md mx-auto p-6 text-center">
      <p className="text-lg font-semibold">Link unavailable</p>
      <p className="text-sm text-charcoal-500 mt-2">{msg}</p>
    </div>
  );
}
