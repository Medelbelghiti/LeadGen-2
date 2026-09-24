"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Expense { id: string; vehicleId: string; category: string; amountCents: number; currency: string; date: Date; merchant: string | null; mileage: number | null; notes: string | null; recurring: boolean; }
interface VehicleOpt { id: string; label: string; }
const CATEGORIES = [
  ["fuel","Fuel"], ["maintenance","Maintenance"], ["repair","Repair"], ["insurance","Insurance"],
  ["tax","Tax"], ["registration","Registration"], ["tires","Tires"], ["parking","Parking"],
  ["tolls","Tolls"], ["cleaning","Cleaning"], ["accessories","Accessories"],
  ["financing","Financing"], ["charging","Charging"], ["other","Other"],
];

export function EditExpenseForm({ expense, vehicles }: { expense: Expense; vehicles: VehicleOpt[] }) {
  const router = useRouter();
  const [vehicleId, setV] = useState(expense.vehicleId);
  const [category, setC] = useState(expense.category);
  const [amount, setA] = useState((expense.amountCents / 100).toString());
  const [date, setD] = useState(new Date(expense.date).toISOString().slice(0, 10));
  const [merchant, setM] = useState(expense.merchant ?? "");
  const [mileage, setMi] = useState(expense.mileage?.toString() ?? "");
  const [notes, setN] = useState(expense.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    const cents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) { setErr("Amount must be > 0"); setBusy(false); return; }
    const r = await fetch(`/api/expenses/${expense.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vehicleId, category, amountCents: cents, currency: expense.currency,
        date: new Date(date).toISOString(),
        merchant: merchant || null, mileage: mileage ? Number(mileage) : null, notes: notes || null,
      }),
    });
    setBusy(false);
    if (!r.ok) { setErr("Save failed"); return; }
    router.push("/expenses");
  };

  return (
    <form onSubmit={submit} className="card mt-6 space-y-3">
      <div>
        <label className="label">Vehicle</label>
        <select className="select" value={vehicleId} onChange={(e) => setV(e.target.value)}>
          {vehicles.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Category</label>
          <select className="select" value={category} onChange={(e) => setC(e.target.value)}>
            {CATEGORIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Date</label>
          <input className="input" type="date" required value={date} onChange={(e) => setD(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">Amount</label>
        <input className="input" type="number" step="0.01" required value={amount} onChange={(e) => setA(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Mileage</label>
          <input className="input" type="number" value={mileage} onChange={(e) => setMi(e.target.value)} />
        </div>
        <div>
          <label className="label">Merchant</label>
          <input className="input" value={merchant} onChange={(e) => setM(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea className="textarea" rows={3} value={notes} onChange={(e) => setN(e.target.value)} />
      </div>
      {err && <p className="text-sm text-rose-600">{err}</p>}
      <div className="flex gap-2">
        <button className="btn btn-primary" disabled={busy} type="submit">{busy ? "Saving..." : "Save"}</button>
        <button type="button" className="btn btn-secondary" onClick={() => router.push("/expenses")}>Cancel</button>
      </div>
    </form>
  );
}
