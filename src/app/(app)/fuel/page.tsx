import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/finance";

export default async function FuelPage() {
  const user = await requireUser();
  const entries = await db.fuelEntry.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    take: 200,
    include: { vehicle: true },
  });

  const avgConsumption = entries.filter((e) => e.consumption != null).reduce((acc, e) => acc + (e.consumption ?? 0), 0) / Math.max(1, entries.filter((e) => e.consumption != null).length);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Fuel</h1>
          <p className="text-sm text-charcoal-500">Average consumption: {avgConsumption ? avgConsumption.toFixed(2) + " L/100km" : "Not enough data yet"}</p>
        </div>
        <Link href="/fuel/new" className="btn btn-accent"><Plus className="w-4 h-4" /> Add fuel</Link>
      </div>

      {entries.length === 0 ? (
        <div className="mt-8 card text-center py-16">
          <p className="font-semibold">No fuel entries yet</p>
          <p className="text-sm text-charcoal-500 mt-1">Track at least 2 full-tank refuellings to see your consumption.</p>
          <Link href="/fuel/new" className="btn btn-accent mt-4 inline-flex">Add fuel</Link>
        </div>
      ) : (
        <div className="card mt-6 overflow-x-auto">
          <table className="basic">
            <thead><tr><th>Date</th><th>Vehicle</th><th>Liters</th><th>Amount</th><th>Mileage</th><th>Consumption</th></tr></thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td>{e.date.toISOString().slice(0, 10)}</td>
                  <td>{e.vehicle.nickname ?? `${e.vehicle.year} ${e.vehicle.brand} ${e.vehicle.model}`}</td>
                  <td>{e.liters?.toFixed(2) ?? "—"}</td>
                  <td>{formatMoney(e.amountCents, e.currency)}</td>
                  <td>{e.mileage.toLocaleString()} {e.mileageUnit}</td>
                  <td>{e.consumption ? `${e.consumption.toFixed(2)} L/100km` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
