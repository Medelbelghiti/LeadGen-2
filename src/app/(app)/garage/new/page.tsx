"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Car } from "lucide-react";

const BRANDS = ["Toyota", "Honda", "BMW", "Mercedes-Benz", "Audi", "Volkswagen", "Renault", "Peugeot", "Citroën", "Dacia", "Hyundai", "Kia", "Tesla", "Ford", "Chevrolet", "Nissan", "Mazda", "Volvo", "Other"];
const FUEL_TYPES = ["gasoline", "diesel", "hybrid", "plugin_hybrid", "ev", "lpg"];

export default function NewVehiclePage() {
  const router = useRouter();
  const [brand, setBrand] = useState("Toyota");
  const [model, setModel] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [trim, setTrim] = useState("");
  const [fuelType, setFuelType] = useState("gasoline");
  const [transmission, setTransmission] = useState("");
  const [fuelEconomy, setFuelEconomy] = useState("");
  const [mileage, setMileage] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [makePrimary, setMakePrimary] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brand, model, year, trim: trim || null, fuelType, transmission: transmission || null,
        fuelEconomyText: fuelEconomy || null,
        currentMileage: mileage ? Number(mileage) : null,
        currentMileageUnit: "km",
        purchaseDate: purchaseDate || null,
        purchasePriceCents: purchasePrice ? Math.round(Number(purchasePrice) * 100) : null,
        purchaseCurrency: "USD",
        isPrimary: makePrimary,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Could not create vehicle");
      return;
    }
    const data = await res.json();
    router.push(`/garage/${data.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold">Add a vehicle</h1>
      <p className="text-sm text-charcoal-500">Add the basics. You can refine everything later.</p>
      <form onSubmit={submit} className="card mt-6 space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="label">Brand</label>
            <select className="select" value={brand} onChange={(e) => setBrand(e.target.value)}>
              {BRANDS.map((b) => (<option key={b} value={b}>{b}</option>))}
            </select>
          </div>
          <div>
            <label className="label">Model</label>
            <input className="input" required placeholder="e.g. Corolla" value={model} onChange={(e) => setModel(e.target.value)} />
          </div>
          <div>
            <label className="label">Year</label>
            <input className="input" type="number" required min={1900} max={new Date().getFullYear() + 1} value={year} onChange={(e) => setYear(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Trim (optional)</label>
            <input className="input" placeholder="e.g. xDrive40i" value={trim} onChange={(e) => setTrim(e.target.value)} />
          </div>
          <div>
            <label className="label">Fuel type</label>
            <select className="select" value={fuelType} onChange={(e) => setFuelType(e.target.value)}>
              {FUEL_TYPES.map((f) => (<option key={f} value={f}>{f}</option>))}
            </select>
          </div>
          <div>
            <label className="label">Transmission</label>
            <input className="input" placeholder="Manual / Automatic / CVT" value={transmission} onChange={(e) => setTransmission(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Fuel economy</label>
            <input className="input" placeholder="e.g. 6.0 L/100km or 15 kWh/100km" value={fuelEconomy} onChange={(e) => setFuelEconomy(e.target.value)} />
          </div>
          <div>
            <label className="label">Current mileage (km)</label>
            <input className="input" type="number" placeholder="32000" value={mileage} onChange={(e) => setMileage(e.target.value)} />
          </div>
          <div>
            <label className="label">Purchase date</label>
            <input className="input" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Purchase price</label>
            <input className="input" type="number" step="0.01" placeholder="22000" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" checked={makePrimary} onChange={(e) => setMakePrimary(e.target.checked)} />
            Set as my primary vehicle
          </label>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button className="btn btn-accent w-full" disabled={loading}>
          {loading ? "Saving…" : (<><Car className="w-4 h-4" /> Add vehicle</>)}
        </button>
      </form>
    </div>
  );
}
