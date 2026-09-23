"use client";
import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/utils";

type Plan = {
  id: string; key: string; name: string; description: string | null;
  priceCents: number; currency: string; billingPeriod: string;
  monthlyLeadLimit: number; monthlySearchLimit: number; dailySearchLimit: number;
  exportLimit: number; maxResultsPerSearch: number;
  providers: string; features: string;
  teamMembersLimit: number; apiAccess: boolean; apiMonthlyQuota: number;
  stripePriceId: string | null; stripeProductId: string | null;
  active: boolean; sortOrder: number;
};

export default function AdminPlansPage() {
  const [items, setItems] = useState<Plan[]>([]);
  const [draft, setDraft] = useState<Partial<Plan>>({
    key: "", name: "", priceCents: 0, currency: "usd", billingPeriod: "MONTHLY",
    monthlyLeadLimit: 100, monthlySearchLimit: 10, dailySearchLimit: 5,
    exportLimit: 100, maxResultsPerSearch: 50,
    providers: "[\"demo\"]", features: "[]",
    teamMembersLimit: 1, apiAccess: false, apiMonthlyQuota: 0,
    active: true, sortOrder: 0,
  });

  const refresh = async () => {
    const r = await fetch("/api/admin/plans");
    if (r.ok) {
      const j = await r.json();
      setItems(j.items);
    }
  };
  useEffect(() => { void refresh(); }, []);

  const create = async () => {
    const body = {
      ...draft,
      providers: safeArr(draft.providers as string),
      features: safeArr(draft.features as string),
    };
    const r = await fetch("/api/admin/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) { setDraft({ ...draft, key: "", name: "" }); void refresh(); }
    else alert((await r.json()).error || "Failed");
  };

  const toggleActive = async (p: Plan) => {
    await fetch(`/api/admin/plans/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !p.active }),
    });
    void refresh();
  };

  const updateLimit = async (p: Plan, field: string, value: number) => {
    await fetch(`/api/admin/plans/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    void refresh();
  };

  return (
    <div>
      <h2 className="text-xl font-bold">Plans</h2>

      <div className="card mt-4">
        <p className="font-semibold">Create plan</p>
        <div className="grid md:grid-cols-3 gap-2 mt-2 text-sm">
          <input className="input" placeholder="key (free/pro/business/lifetime)" value={draft.key ?? ""} onChange={(e) => setDraft({ ...draft, key: e.target.value })} />
          <input className="input" placeholder="Name" value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <input className="input" type="number" placeholder="Price (cents)" value={draft.priceCents ?? 0} onChange={(e) => setDraft({ ...draft, priceCents: Number(e.target.value) })} />
          <select className="select" value={draft.billingPeriod as string} onChange={(e) => setDraft({ ...draft, billingPeriod: e.target.value })}>
            <option>FREE</option><option>MONTHLY</option><option>YEARLY</option><option>LIFETIME</option>
          </select>
          <input className="input" type="number" placeholder="Monthly leads" value={draft.monthlyLeadLimit ?? 0} onChange={(e) => setDraft({ ...draft, monthlyLeadLimit: Number(e.target.value) })} />
          <input className="input" type="number" placeholder="Monthly searches" value={draft.monthlySearchLimit ?? 0} onChange={(e) => setDraft({ ...draft, monthlySearchLimit: Number(e.target.value) })} />
          <input className="input" type="number" placeholder="Daily searches" value={draft.dailySearchLimit ?? 0} onChange={(e) => setDraft({ ...draft, dailySearchLimit: Number(e.target.value) })} />
          <input className="input" type="number" placeholder="Export rows / mo" value={draft.exportLimit ?? 0} onChange={(e) => setDraft({ ...draft, exportLimit: Number(e.target.value) })} />
          <input className="input" type="number" placeholder="Max results / search" value={draft.maxResultsPerSearch ?? 0} onChange={(e) => setDraft({ ...draft, maxResultsPerSearch: Number(e.target.value) })} />
          <input className="input" placeholder={'Providers JSON e.g. ["demo","openstreetmap","google"]'} value={draft.providers as string ?? ""} onChange={(e) => setDraft({ ...draft, providers: e.target.value })} />
          <input className="input" placeholder={'Features JSON e.g. ["Multi-provider","API"]'} value={draft.features as string ?? ""} onChange={(e) => setDraft({ ...draft, features: e.target.value })} />
          <input className="input" type="number" placeholder="Team members" value={draft.teamMembersLimit ?? 1} onChange={(e) => setDraft({ ...draft, teamMembersLimit: Number(e.target.value) })} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!draft.apiAccess} onChange={(e) => setDraft({ ...draft, apiAccess: e.target.checked })} /> API access</label>
          <input className="input" type="number" placeholder="API monthly quota" value={draft.apiMonthlyQuota ?? 0} onChange={(e) => setDraft({ ...draft, apiMonthlyQuota: Number(e.target.value) })} />
          <input className="input" placeholder="Stripe price ID" value={draft.stripePriceId ?? ""} onChange={(e) => setDraft({ ...draft, stripePriceId: e.target.value })} />
          <input className="input" type="number" placeholder="Sort order" value={draft.sortOrder ?? 0} onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })} />
        </div>
        <button onClick={create} className="btn btn-primary mt-3">Create</button>
      </div>

      <div className="card mt-4 overflow-x-auto">
        <table className="basic">
          <thead>
            <tr>
              <th>Plan</th><th>Price</th><th>Period</th>
              <th>Leads</th><th>Searches (M)</th><th>Daily</th><th>Exports</th><th>Max/search</th>
              <th>Providers</th><th>API</th><th>Team</th><th>Stripe ID</th><th>Active</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td><strong>{p.name}</strong><br /><span className="text-xs text-slate-500">{p.key}</span></td>
                <td>{formatMoney(p.priceCents, p.currency)}</td>
                <td>{p.billingPeriod}</td>
                <td><NumCell value={p.monthlyLeadLimit} onChange={(v) => updateLimit(p, "monthlyLeadLimit", v)} /></td>
                <td><NumCell value={p.monthlySearchLimit} onChange={(v) => updateLimit(p, "monthlySearchLimit", v)} /></td>
                <td><NumCell value={p.dailySearchLimit} onChange={(v) => updateLimit(p, "dailySearchLimit", v)} /></td>
                <td><NumCell value={p.exportLimit} onChange={(v) => updateLimit(p, "exportLimit", v)} /></td>
                <td><NumCell value={p.maxResultsPerSearch} onChange={(v) => updateLimit(p, "maxResultsPerSearch", v)} /></td>
                <td className="text-xs">{safeArr(p.providers).join(", ")}</td>
                <td>{p.apiAccess ? `${p.apiMonthlyQuota}/mo` : "—"}</td>
                <td>{p.teamMembersLimit}</td>
                <td className="text-xs">{p.stripePriceId ?? "—"}</td>
                <td><button onClick={() => toggleActive(p)} className={`badge ${p.active ? "badge-ok" : "badge-err"}`}>{p.active ? "active" : "disabled"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NumCell({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return <input className="input" style={{ width: 90 }} type="number" value={v} onChange={(e) => setV(Number(e.target.value))} onBlur={() => onChange(v)} />;
}

function safeArr(s: string): string[] {
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; }
}
