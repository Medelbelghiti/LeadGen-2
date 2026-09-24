import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/finance";

export default async function ExpensesPage({ searchParams }: { searchParams: { vehicle?: string; category?: string } }) {
  const user = await requireUser();
  const vehicles = await db.vehicle.findMany({ where: { userId: user.id, archived: false }, orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }] });

  const where: Record<string, unknown> = { userId: user.id };
  if (searchParams.vehicle) where.vehicleId = searchParams.vehicle;
  if (searchParams.category) where.category = searchParams.category;

  const expenses = await db.expense.findMany({ where, orderBy: { date: "desc" }, take: 200 });

  const vehicleNameById: Record<string, string> = {};
  for (const v of vehicles) vehicleNameById[v.id] = v.nickname ?? `${v.year} ${v.brand} ${v.model}`;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Expenses</h1>
        <Link href="/expenses/new" className="btn btn-accent"><Plus className="w-4 h-4" /> Add expense</Link>
      </div>

      {expenses.length === 0 ? (
        <div className="mt-8 card text-center py-16">
          <p className="font-semibold">No expenses yet</p>
          <p className="text-sm text-charcoal-500 mt-1">Record your first expense to start understanding where your money goes.</p>
          <Link href="/expenses/new" className="btn btn-accent mt-4 inline-flex">Add expense</Link>
        </div>
      ) : (
        <div className="card mt-6 overflow-x-auto">
          <table className="basic">
            <thead>
              <tr><th>Date</th><th>Vehicle</th><th>Category</th><th>Merchant</th><th>Mileage</th><th>Amount</th></tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td>{e.date.toISOString().slice(0, 10)}</td>
                  <td>{vehicleNameById[e.vehicleId] ?? "—"}</td>
                  <td className="capitalize">{e.category}</td>
                  <td>{e.merchant ?? "—"}</td>
                  <td>{e.mileage?.toLocaleString() ?? "—"}</td>
                  <td>{formatMoney(e.amountCents, e.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
