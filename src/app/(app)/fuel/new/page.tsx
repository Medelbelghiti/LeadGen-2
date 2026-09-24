"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Fuel } from "lucide-react";

interface VehicleOpt { id: string; label: string; fuelType: string; currency: string; }

export default function NewFuelPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<VehicleOpt[]>([]);
  const [vehicleId, setVehicleId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [mileage, setMileage] = useState("");
  const [liters, setLiters] = useState("");
  const [amount, setAmount] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [station, setStation] = useState("");
  const [fullTank, setFullTank] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useState(() => {
    fetch("/api/vehicles").then((r) => r.json()).then((j) => {
      const list: VehicleOpt[] = (j.vehicles ?? []).map((v: any) => ({
        id: v.id, label: v.nickname ?? `${v.year} ${v.brand} ${v.model}`,
        fuelType: v.fuelType, currency: v.purchaseCurrency ?? "USD",
      }));
      setVehicles(list);
      if (list.length > 0) setVehicleId(list[0].id);
    });
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const amountCents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setError("Amount must be greater than 0");
      setLoading(false);
      return;
    }
    const res = await fetch("/api/fuel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vehicleId,
        date: new Date(date).toISOString(),
        mileage: Number(mileage),
        liters: liters ? Number(liters) : null,
        amountCents,
        currency: "USD",
        pricePerUnit: pricePerUnit ? Number(pricePerUnit) : null,
        fullTank,
        station: station || null,
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
        <h1 className="text-2xl font-bold">Add fuel</h1>
        <div className="card mt-6 text-center">
          <p className="font-semibold">You need a vehicle first</p>
          <Link href="/garage/new" className="btn btn-accent mt-4 inline-flex">Add a vehicle</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold">Add fuel</h1>
      <p className="text-sm text-charcoal-500">Mark "full tank" so we can compute your consumption.</p>

      <form onSubmit={submit} className="card mt-6 space-y-3">
        <div>
          <label className="label">Vehicle</label>
          <select className="select" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Date</label>
            <input className="input" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Mileage (km)</label>
            <input className="input" type="number" required value={mileage} onChange={(e) => setMileage(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Liters</label>
            <input className="input" type="number" step="0.01" value={liters} onChange={(e) => setLiters(e.target.value)} placeholder="38.5" />
          </div>
          <div>
            <label className="label">Amount</label>
            <input className="input" type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="55.00" />
          </div>
          <div>
            <label className="label">Price/L</label>
            <input className="input" type="number" step="0.01" value={pricePerUnit} onChange={(e) => setPricePerUnit(e.target.value)} placeholder="1.45" />
          </div>
        </div>
        <div>
          <label className="label">Station (optional)</label>
          <input className="input" value={station} onChange={(e) => setStation(e.target.value)} placeholder="Shell" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={fullTank} onChange={(e) => setFullTank(e.target.checked)} />
          Full tank (required for consumption calc)
        </label>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button className="btn btn-accent w-full" disabled={loading}>
          {loading ? "Saving…" : (<><Fuel className="w-4 h-4" /> Save fuel</>)}
        </button>
      </form>
    </div>
  );
}
