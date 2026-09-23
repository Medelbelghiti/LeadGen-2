import { requireUser } from "@/lib/auth";
import { getEntitlements } from "@/lib/plans";
import { getMonthlyUsage } from "@/lib/usage";
import { db } from "@/lib/db";
import Link from "next/link";
import { formatMoney } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await requireUser();
  const ent = await getEntitlements(user);
  const usage = await getMonthlyUsage(user.id, ent.periodKey);
  const totalLeads = await db.lead.count({ where: { userId: user.id } });
  const recentSearches = await db.search.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const Pct = (used: number, limit: number) => Math.min(100, Math.round((used / Math.max(1, limit)) * 100));

  return (
    <div className="container-app">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {user.name ?? user.email}</h1>
          <p className="text-sm text-slate-600">
            Current plan: <strong>{ent.planName}</strong> · {ent.isTrial ? "Free trial" : ent.subscriptionStatus}
            {ent.trialEndsAt && ` · trial ends ${ent.trialEndsAt.toISOString().slice(0, 10)}`}
            {ent.currentPeriodEnd && !ent.isTrial && ` · renews ${ent.currentPeriodEnd.toISOString().slice(0, 10)}`}
          </p>
        </div>
        <Link href="/search" className="btn btn-primary">Start a new search</Link>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-6">
        <MetricCard label="Leads this month" value={usage.leads} total={ent.monthlyLeadLimit} pct={Pct(usage.leads, ent.monthlyLeadLimit)} />
        <MetricCard label="Searches this month" value={usage.searches} total={ent.monthlySearchLimit} pct={Pct(usage.searches, ent.monthlySearchLimit)} />
        <MetricCard label="Exports" value={usage.exports} total={ent.exportLimit} pct={Pct(usage.exports, ent.exportLimit)} />
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-6">
        <div className="card">
          <p className="font-semibold">Total leads stored</p>
          <p className="text-3xl font-extrabold mt-2">{totalLeads.toLocaleString()}</p>
          <Link href="/leads" className="text-brand-700 text-sm underline mt-3 inline-block">Browse leads →</Link>
        </div>
        <div className="card">
          <p className="font-semibold">Referral balance</p>
          <p className="text-3xl font-extrabold mt-2">+{user.bonusLeads}</p>
          <p className="text-xs text-slate-500">Bonus leads granted by your referrals.</p>
          <Link href="/referrals" className="text-brand-700 text-sm underline mt-3 inline-block">Referral dashboard →</Link>
        </div>
      </div>

      <div className="card mt-6">
        <p className="font-semibold">Recent searches</p>
        {recentSearches.length === 0 ? (
          <p className="text-sm text-slate-600 mt-2">
            No searches yet. <Link className="underline" href="/search">Run your first search →</Link>
          </p>
        ) : (
          <table className="basic mt-3">
            <thead><tr><th>Niche</th><th>Location</th><th>Status</th><th>Results</th><th>When</th><th></th></tr></thead>
            <tbody>
              {recentSearches.map((s) => (
                <tr key={s.id}>
                  <td>{s.niche}</td>
                  <td>{s.location}</td>
                  <td><span className={`badge ${s.status === "COMPLETED" ? "badge-ok" : s.status === "FAILED" ? "badge-err" : "badge-info"}`}>{s.status}</span></td>
                  <td>{s.resultsCount}</td>
                  <td>{s.createdAt.toISOString().slice(0, 10)}</td>
                  <td><Link href={`/search/${s.id}`} className="underline">Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, total, pct }: { label: string; value: number; total: number; pct: number }) {
  return (
    <div className="card">
      <p className="text-xs label">{label}</p>
      <p className="text-2xl font-bold mt-1">{value.toLocaleString()} <span className="text-sm font-medium text-slate-500">/ {total.toLocaleString()}</span></p>
      <div className="progress mt-3"><span style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

void formatMoney;
