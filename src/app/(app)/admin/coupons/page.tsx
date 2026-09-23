"use client";
import { useEffect, useState } from "react";

type Coupon = {
  id: string; code: string; type: string; value: number; duration: string; durationMonths?: number;
  firstPurchaseOnly: boolean; expiresAt: string | null; maxRedemptions: number | null;
  perUserLimit: number; minPurchaseCents: number | null;
  planKeys: string; active: boolean; timesRedeemed: number;
};

export default function AdminCouponsPage() {
  const [items, setItems] = useState<Coupon[]>([]);
  const [draft, setDraft] = useState({ code: "", type: "PERCENT", value: 10, duration: "ONCE", maxRedemptions: null as number | null, planKeys: "" });

  const refresh = async () => {
    const r = await fetch("/api/admin/coupons");
    if (r.ok) {
      const j = await r.json();
      setItems(j.items);
    }
  };
  useEffect(() => { void refresh(); }, []);

  const create = async () => {
    const body = {
      code: draft.code.trim().toUpperCase(),
      type: draft.type,
      value: draft.value,
      duration: draft.duration,
      maxRedemptions: draft.maxRedemptions ?? undefined,
      planKeys: draft.planKeys ? draft.planKeys.split(",").map((s) => s.trim()).filter(Boolean) : [],
    };
    const r = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) { setDraft({ ...draft, code: "" }); void refresh(); }
    else alert((await r.json()).error || "Failed");
  };

  const toggleActive = async (c: Coupon) => {
    await fetch(`/api/admin/coupons/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !c.active }),
    });
    void refresh();
  };

  return (
    <div>
      <h2 className="text-xl font-bold">Coupons</h2>

      <div className="card mt-4">
        <p className="font-semibold">Create coupon</p>
        <div className="grid md:grid-cols-4 gap-2 mt-2 text-sm">
          <input className="input" placeholder="CODE" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} />
          <select className="select" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
            <option value="PERCENT">PERCENT</option><option value="FIXED">FIXED</option>
          </select>
          <input className="input" type="number" placeholder="Value" value={draft.value} onChange={(e) => setDraft({ ...draft, value: Number(e.target.value) })} />
          <select className="select" value={draft.duration} onChange={(e) => setDraft({ ...draft, duration: e.target.value })}>
            <option value="ONCE">ONCE</option><option value="FIRST_MONTH">FIRST_MONTH</option><option value="FOREVER">FOREVER</option>
          </select>
          <input className="input" type="number" placeholder="Max redemptions" value={draft.maxRedemptions ?? ""} onChange={(e) => setDraft({ ...draft, maxRedemptions: e.target.value ? Number(e.target.value) : null })} />
          <input className="input" placeholder="Plans (comma-separated keys)" value={draft.planKeys} onChange={(e) => setDraft({ ...draft, planKeys: e.target.value })} />
        </div>
        <button onClick={create} className="btn btn-primary mt-3">Create</button>
      </div>

      <div className="card mt-4 overflow-x-auto">
        <table className="basic">
          <thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Duration</th><th>Redeemed</th><th>Max</th><th>Plans</th><th>Active</th></tr></thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td className="font-mono">{c.code}</td>
                <td>{c.type}</td>
                <td>{c.type === "PERCENT" ? `${c.value}%` : `${c.value}¢`}</td>
                <td>{c.duration}</td>
                <td>{c.timesRedeemed}</td>
                <td>{c.maxRedemptions ?? "—"}</td>
                <td className="text-xs">{safeArr(c.planKeys).join(", ") || "all"}</td>
                <td><button onClick={() => toggleActive(c)} className={`badge ${c.active ? "badge-ok" : "badge-err"}`}>{c.active ? "active" : "disabled"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function safeArr(s: string): string[] {
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; }
}
