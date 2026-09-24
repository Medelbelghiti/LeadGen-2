"use client";

import { useState } from "react";

export function CarCostCalculator() {
  const [kmYear, setKmYear] = useState(12000);
  const [consumption, setConsumption] = useState(7);
  const [fuelPrice, setFuelPrice] = useState(1.5);
  const [insurance, setInsurance] = useState(900);
  const [maintenance, setMaintenance] = useState(600);
  const [parking, setParking] = useState(60);
  const [tolls, setTolls] = useState(30);
  const [depreciation, setDepreciation] = useState(2000);

  const fuel = (kmYear / 100) * consumption * fuelPrice;
  const monthly = (fuel + insurance + maintenance + parking + tolls + depreciation) / 12;

  return (
    <div className="card mt-6 space-y-4">
      <div className="grid md:grid-cols-2 gap-3">
        <div><label className="label">Annual distance (km)</label><input className="input" type="number" value={kmYear} onChange={(e) => setKmYear(Number(e.target.value))} /></div>
        <div><label className="label">Consumption (L/100km)</label><input className="input" type="number" step="0.1" value={consumption} onChange={(e) => setConsumption(Number(e.target.value))} /></div>
        <div><label className="label">Fuel price (per L)</label><input className="input" type="number" step="0.01" value={fuelPrice} onChange={(e) => setFuelPrice(Number(e.target.value))} /></div>
        <div><label className="label">Insurance / year</label><input className="input" type="number" value={insurance} onChange={(e) => setInsurance(Number(e.target.value))} /></div>
        <div><label className="label">Maintenance / year</label><input className="input" type="number" value={maintenance} onChange={(e) => setMaintenance(Number(e.target.value))} /></div>
        <div><label className="label">Parking / month</label><input className="input" type="number" value={parking} onChange={(e) => setParking(Number(e.target.value))} /></div>
        <div><label className="label">Tolls / month</label><input className="input" type="number" value={tolls} onChange={(e) => setTolls(Number(e.target.value))} /></div>
        <div><label className="label">Depreciation / year</label><input className="input" type="number" value={depreciation} onChange={(e) => setDepreciation(Number(e.target.value))} /></div>
      </div>
      <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
        <p className="text-sm text-charcoal-500">Estimated monthly cost</p>
        <p className="text-3xl font-bold text-emerald-700">${monthly.toFixed(2)}</p>
        <p className="text-sm text-charcoal-500 mt-2">Estimated annual cost: <strong>${(monthly * 12).toFixed(2)}</strong></p>
        <p className="text-sm text-charcoal-500">Fuel share: <strong>${fuel.toFixed(2)}/yr</strong></p>
      </div>
      <p className="text-xs text-charcoal-500">Estimate only. Actual costs depend on driving style, location, vehicle age, and individual choices.</p>
    </div>
  );
}
