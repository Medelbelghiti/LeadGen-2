"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Receipt } from "lucide-react";

const CATEGORIES = [
  ["fuel","Fuel"], ["maintenance","Maintenance"], ["repair","Repair"], ["insurance","Insurance"],
  ["tax","Tax"], ["registration","Registration"], ["tires","Tires"], ["parking","Parking"],
  ["tolls","Tolls"], ["cleaning","Cleaning"], ["accessories","Accessories"],
  ["financing","Financing"], ["charging","Charging"], ["other","Other"],
];

interface VehicleOpt { id: string; label: string; currency: string; }

export default function NewExpensePage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<VehicleOpt[]>([]);
  const [vehicleId, setVehicleId] = useState("");
  const [category, setCategory] = useState("fuel");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [merchant, setMerchant] = useState("");
  const [mileage, setMileage] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useState(() => {
    fetch("/api/vehicles").then((r) => r.json()).then((j) => {
      const list: VehicleOpt[] = (j.vehicles ?? []).map((v: any) => ({
        id: v.id, label: v.nickname ?? `${v.year} ${v.brand} ${v.model}`, currency: v.purchaseCurrency ?? "USD",
      }));
      setVehicles(list);
      if (list.length > 0) setVehicleId(list[0].id);
    });
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const cents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      setError("Amount must be greater than 0");
      setLoading(false);
      return;
    }
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vehicleId, category, amountCents: cents, currency: "USD",
        date: new Date(date).toISOString(),
        merchant: merchant || null,
        mileage: mileage ? Number(mileage) : null,
        notes: notes || null,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Failed to save");
      return;
    }
    router.push(`/garage/${vehicleId}`);
  };

  if (vehicles.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold">Add an expense</h1>
        <div className="card mt-6 text-center">
          <p className="font-semibold">You need a vehicle first</p>
          <p className="text-sm text-charcoal-500 mt-1">Add a vehicle to start tracking expenses.</p>
          <Link href="/garage/new" className="btn btn-accent mt-4 inline-flex">Add a vehicle</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold">Add an expense</h1>
      <p className="text-sm text-charcoal-500">Quick entry — you can add more details later.</p>

      <form onSubmit={submit} className="card mt-6 space-y-3">
        <div>
          <label className="label">Vehicle</label>
          <select className="select" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Category</label>
            <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input className="input" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Amount</label>
          <input className="input" type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Mileage (optional)</label>
            <input className="input" type="number" value={mileage} onChange={(e) => setMileage(e.target.value)} placeholder="32000" />
          </div>
          <div>
            <label className="label">Merchant (optional)</label>
            <input className="input" value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="Shell, Total, …" />
          </div>
        </div>
        <div>
          <label className="label">Notes (optional)</label>
          <textarea className="textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button className="btn btn-accent w-full" disabled={loading}>
          {loading ? "Saving…" : (<><Receipt className="w-4 h-4" /> Save expense</>)}
        </button>
      </form>
    </div>
  );
}
