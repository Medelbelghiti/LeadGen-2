"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Coupon {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  duration: "ONCE" | "FIRST_MONTH" | "FOREVER";
  firstPurchaseOnly: boolean;
  expiresAt: string | null;
  maxRedemptions: number | null;
  perUserLimit: number;
  minPurchaseCents: number | null;
  planKeys: string[];
  active: boolean;
  timesRedeemed: number;
  redemptions: number;
}

export function CouponsAdmin({ coupons }: { coupons: Coupon[] }) {
  const router = useRouter();
  const [code, setC] = useState("");
  const [type, setT] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [value, setV] = useState(10);
  const [duration, setD] = useState<"ONCE" | "FIRST_MONTH" | "FOREVER">("ONCE");
  const [busy, setB] = useState(false);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setB(true);
    await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.toUpperCase(), type, value, duration }),
    });
    setB(false);
    setC(""); setV(10);
    router.refresh();
  };

  const toggle = async (id: string, active: boolean) => {
    await fetch(`/api/admin/coupons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    router.refresh();
  };

  return (
    <div className="mt-6 space-y-4">
      <form onSubmit={create} className="card grid md:grid-cols-5 gap-2 items-end text-sm">
        <div>
          <label className="label">Code</label>
          <input className="input" required value={code} onChange={(e) => setC(e.target.value)} />
        </div>
        <div>
          <label className="label">Type</label>
          <select className="select" value={type} onChange={(e) => setT(e.target.value as "PERCENT" | "FIXED")}>
            <option value="PERCENT">Percent</option>
            <option value="FIXED">Fixed</option>
          </select>
        </div>
        <div>
          <label className="label">{type === "PERCENT" ? "Percent off" : "Amount off (cents)"}</label>
          <input className="input" type="number" required value={value} onChange={(e) => setV(Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Duration</label>
          <select className="select" value={duration} onChange={(e) => setD(e.target.value as "ONCE" | "FIRST_MONTH" | "FOREVER")}>
            <option value="ONCE">Once</option>
            <option value="FIRST_MONTH">First month</option>
            <option value="FOREVER">Forever</option>
          </select>
        </div>
        <button className="btn btn-primary" disabled={busy}>{busy ? "…" : "Create"}</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="basic">
          <thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Duration</th><th>Redeemed</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id}>
                <td className="font-mono">{c.code}</td>
                <td>{c.type}</td>
                <td>{c.value}{c.type === "PERCENT" ? "%" : "¢"}</td>
                <td>{c.duration}</td>
                <td>{c.timesRedeemed}</td>
                <td><span className={`badge ${c.active ? "badge-ok" : "badge-warn"}`}>{c.active ? "active" : "disabled"}</span></td>
                <td>
                  <button onClick={() => toggle(c.id, !c.active)} className="text-xs underline">
                    {c.active ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
