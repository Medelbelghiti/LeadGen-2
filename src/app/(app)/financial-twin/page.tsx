import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeVehicleCost } from "@/lib/compute-cost";
import { formatMoney, projectCost } from "@/lib/finance";
import { LineChart, ArrowRight } from "lucide-react";

export default async function FinancialTwinPage() {
  const user = await requireUser();
  const vehicles = await db.vehicle.findMany({ where: { userId: user.id, archived: false } });
  if (vehicles.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold">Financial Twin</h1>
        <p className="text-sm text-charcoal-500 mt-2">Add a vehicle to see your Financial Twin.</p>
        <Link href="/garage/new" className="btn btn-accent mt-4 inline-flex">Add a vehicle</Link>
      </div>
    );
  }

  const rows = await Promise.all(vehicles.map(async (v) => {
    const r = await computeVehicleCost(user.id, v.id);
    return { v, result: r };
  }));

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><LineChart className="w-5 h-5 text-emerald-600" /> Financial Twin</h1>
        <p className="text-sm text-charcoal-500">A live financial model of each of your vehicles. Every number is labeled ACTUAL, ESTIMATE, or FORECAST.</p>
      </div>

      <div className="card overflow-x-auto">
        <table className="basic">
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Monthly (ACTUAL)</th>
              <th>Cost / km</th>
              <th>Total spent</th>
              <th>12-mo forecast</th>
              <th>Months of data</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ v, result }) => {
              if (!result.ok) {
                return (
                  <tr key={v.id}>
                    <td>{v.nickname ?? `${v.year} ${v.brand} ${v.model}`}</td>
                    <td colSpan={5} className="text-amber-700 text-sm">Mixed-currency data — cannot aggregate. Edit entries to use one currency.</td>
                    <td><Link href={`/garage/${v.id}`} className="text-xs underline">Edit</Link></td>
                  </tr>
                );
              }
              const s = result.summary;
              const f = projectCost(s, 12);
              return (
                <tr key={v.id}>
                  <td><Link href={`/garage/${v.id}`} className="underline">{v.nickname ?? `${v.year} ${v.brand} ${v.model}`}</Link></td>
                  <td>{formatMoney(s.monthlyAverage, s.baseCurrency)}</td>
                  <td>{s.costPerKm != null ? formatMoney(s.costPerKm, s.baseCurrency) : "—"}</td>
                  <td>{formatMoney(s.totalSpent, s.baseCurrency)}</td>
                  <td className="text-emerald-700">{formatMoney(f.total, s.baseCurrency)}</td>
                  <td>{s.monthsOfData}</td>
                  <td><Link href={`/garage/${v.id}`} className="text-xs underline inline-flex items-center gap-1">Open <ArrowRight className="w-3 h-3" /></Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-charcoal-500">
        AutoEco never invents financial data. When you don't have enough data, cells are shown as "—" rather than fabricated estimates.
      </p>
    </div>
  );
}
