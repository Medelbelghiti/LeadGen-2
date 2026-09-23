"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Plan {
  id: string;
  key: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  billingPeriod: string;
  monthlyLeadLimit: number;
  monthlySearchLimit: number;
  dailySearchLimit: number;
  exportLimit: number;
  maxResultsPerSearch: number;
  providers: string[];
  features: string[];
  teamMembersLimit: number;
  apiAccess: boolean;
  apiMonthlyQuota: number;
  stripePriceId: string | null;
  stripeProductId: string | null;
  active: boolean;
  sortOrder: number;
}

export function PlanEditor({ plan }: { plan: Plan }) {
  const router = useRouter();
  const [v, setV] = useState(plan);
  const [busy, setB] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const save = async () => {
    setB(true);
    setMsg(null);
    const r = await fetch(`/api/admin/plans/${v.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(v),
    });
    setB(false);
    setMsg(r.ok ? "Saved" : "Save failed");
    router.refresh();
  };

  const disable = async () => {
    setB(true);
    await fetch(`/api/admin/plans/${v.id}`, { method: "DELETE" });
    setB(false);
    router.refresh();
  };

  const N = (key: keyof Plan, label: string) => (
    <div>
      <label className="label">{label}</label>
      <input className="input" type="number" value={v[key] as number} onChange={(e) => setV({ ...v, [key]: Number(e.target.value) })} />
    </div>
  );

  return (
    <div className="card">
      <div className="flex justify-between items-center">
        <p className="font-bold">{v.name} <span className="text-xs text-slate-500">({v.key})</span></p>
        <span className={`badge ${v.active ? "badge-ok" : "badge-warn"}`}>{v.active ? "active" : "disabled"}</span>
      </div>
      <div className="grid md:grid-cols-4 gap-2 mt-3 text-sm">
        {N("priceCents", "Price (cents)")}
        {N("monthlyLeadLimit", "Leads / mo")}
        {N("monthlySearchLimit", "Searches / mo")}
        {N("dailySearchLimit", "Searches / day")}
        {N("exportLimit", "Exports / mo")}
        {N("maxResultsPerSearch", "Max results / search")}
        {N("teamMembersLimit", "Team members")}
        {N("apiMonthlyQuota", "API quota / mo")}
      </div>
      <div className="grid md:grid-cols-2 gap-2 mt-2 text-sm">
        <div>
          <label className="label">Providers (comma-separated)</label>
          <input className="input" value={v.providers.join(", ")} onChange={(e) => setV({ ...v, providers: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
        </div>
        <div>
          <label className="label">Features (comma-separated)</label>
          <input className="input" value={v.features.join(", ")} onChange={(e) => setV({ ...v, features: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
        </div>
        <div>
          <label className="label">Stripe Price ID</label>
          <input className="input" value={v.stripePriceId ?? ""} onChange={(e) => setV({ ...v, stripePriceId: e.target.value })} />
        </div>
        <div>
          <label className="label">Stripe Product ID</label>
          <input className="input" value={v.stripeProductId ?? ""} onChange={(e) => setV({ ...v, stripeProductId: e.target.value })} />
        </div>
      </div>
      <div className="flex gap-2 items-center mt-3 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={v.apiAccess} onChange={(e) => setV({ ...v, apiAccess: e.target.checked })} />
          API access
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={v.active} onChange={(e) => setV({ ...v, active: e.target.checked })} />
          Active
        </label>
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={save} disabled={busy} className="btn btn-primary">{busy ? "…" : "Save changes"}</button>
        {v.active && <button onClick={disable} disabled={busy} className="btn btn-danger">Disable</button>}
        {msg && <span className="text-sm text-slate-600 self-center">{msg}</span>}
      </div>
    </div>
  );
}
