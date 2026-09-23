"use client";
import { useEffect, useState } from "react";

type Stats = {
  usersCount: number; leadsCount: number; searchesCount: number;
  activeSubs: number; canceledSubs: number; trials: number;
  failedPayments: number; lifetimeSubs: number;
  pendingAffiliates: number; activeAffiliates: number;
  paidCents: number; monthlyUsage: { action: string; _sum: { quantity: number | null } }[];
  recentInvoices: { id: string; amountCents: number; createdAt: string; status: string }[];
};

type Health = {
  database: string; stripe: string; email: string;
  providers: Record<string, { requests: number; results: number; errors: number }>;
};

export function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats").then((r) => r.json()).then((j) => setStats(j));
    fetch("/api/admin/health").then((r) => r.json()).then((j) => setHealth(j));
  }, []);

  if (!stats) return <p>Loading…</p>;
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-4 gap-3">
        <Stat label="Users" value={stats.usersCount.toLocaleString()} />
        <Stat label="Total leads" value={stats.leadsCount.toLocaleString()} />
        <Stat label="Searches" value={stats.searchesCount.toLocaleString()} />
        <Stat label="Active subs" value={stats.activeSubs.toLocaleString()} />
        <Stat label="Trials" value={stats.trials.toLocaleString()} />
        <Stat label="Lifetime purchases" value={stats.lifetimeSubs.toLocaleString()} />
        <Stat label="Canceled subs" value={stats.canceledSubs.toLocaleString()} />
        <Stat label="Failed payments" value={stats.failedPayments.toLocaleString()} />
        <Stat label="Paid revenue" value={`$${(stats.paidCents / 100).toFixed(2)}`} />
        <Stat label="Pending affiliates" value={stats.pendingAffiliates.toLocaleString()} />
        <Stat label="Active affiliates" value={stats.activeAffiliates.toLocaleString()} />
      </div>

      <div className="card">
        <p className="font-semibold">This month usage (by action)</p>
        <ul className="text-sm mt-2 space-y-1">
          {stats.monthlyUsage.map((u) => (
            <li key={u.action} className="flex justify-between">
              <span>{u.action}</span>
              <strong>{(u._sum.quantity ?? 0).toLocaleString()}</strong>
            </li>
          ))}
        </ul>
      </div>

      {health && (
        <div className="card">
          <p className="font-semibold">System health</p>
          <div className="grid md:grid-cols-3 gap-3 mt-2 text-sm">
            <HealthItem label="Database" status={health.database} />
            <HealthItem label="Stripe" status={health.stripe} />
            <HealthItem label="Email" status={health.email} />
          </div>
          {Object.keys(health.providers).length > 0 && (
            <div className="mt-4">
              <p className="font-semibold">Providers (month)</p>
              <table className="basic mt-2 text-sm">
                <thead><tr><th>Provider</th><th>Requests</th><th>Results</th><th>Errors</th></tr></thead>
                <tbody>
                  {Object.entries(health.providers).map(([k, v]) => (
                    <tr key={k}><td>{k}</td><td>{v.requests}</td><td>{v.results}</td><td>{v.errors}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="card">
        <p className="font-semibold">Recent paid invoices</p>
        <table className="basic mt-2 text-sm">
          <thead><tr><th>ID</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            {stats.recentInvoices.map((i) => (
              <tr key={i.id}><td>{i.id.slice(0, 12)}</td><td>${(i.amountCents / 100).toFixed(2)}</td><td>{i.status}</td><td>{new Date(i.createdAt).toISOString().slice(0, 10)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="card"><p className="label">{label}</p><p className="text-2xl font-bold mt-1">{value}</p></div>;
}

function HealthItem({ label, status }: { label: string; status: string }) {
  const cls = status === "OK" ? "badge-ok" : status === "WARNING" ? "badge-warn" : "badge-err";
  return <div className="border rounded-md p-3"><p className="label">{label}</p><span className={`badge ${cls}`}>{status}</span></div>;
}
