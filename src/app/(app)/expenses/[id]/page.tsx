import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser, assertOwnership } from "@/lib/auth";
import { db } from "@/lib/db";
import { EditExpenseForm } from "./Form";

export default async function EditExpense({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const expense = await db.expense.findUnique({ where: { id: params.id } });
  if (!expense) notFound();
  assertOwnership(expense.userId, user);
  const vehicles = await db.vehicle.findMany({ where: { userId: user.id, archived: false }, orderBy: { createdAt: "desc" } });

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Link href="/expenses" className="text-sm text-charcoal-500 underline">← Back to expenses</Link>
      <h1 className="text-2xl font-bold mt-2">Edit expense</h1>
      <EditExpenseForm expense={expense} vehicles={vehicles.map((v) => ({ id: v.id, label: v.nickname ?? `${v.year} ${v.brand} ${v.model}` }))} />
      <form action={`/api/expenses/${expense.id}`} method="post" onSubmit={(e) => { if (!confirm("Delete this expense?")) e.preventDefault(); }} className="mt-3">
        <input type="hidden" name="_method" value="DELETE" />
        <button type="submit" className="text-rose-600 text-sm underline">Delete expense</button>
      </form>
    </div>
  );
}
