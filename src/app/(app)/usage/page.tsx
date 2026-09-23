import { requireUser } from "@/lib/auth";
import { getEntitlements } from "@/lib/plans";
import { getMonthlyUsage } from "@/lib/usage";

export default async function UsagePage() {
  const user = await requireUser();
  const ent = await getEntitlements(user);
  const usage = await getMonthlyUsage(user.id, ent.periodKey);

  const Pct = (used: number, limit: number) => Math.min(100, Math.round((used / Math.max(1, limit)) * 100));

  const bars = [
    { label: "Leads", used: usage.leads, limit: ent.monthlyLeadLimit },
    { label: "Searches", used: usage.searches, limit: ent.monthlySearchLimit },
    { label: "Exports (rows)", used: usage.exports, limit: ent.exportLimit },
  ];

  return (
    <div className="container-app">
      <h1 className="text-2xl font-bold">Usage</h1>
      <p className="text-sm text-slate-600">Plan: <strong>{ent.planName}</strong> · Period: {ent.periodKey}</p>

      <div className="card mt-4 space-y-4">
        {bars.map((b) => (
          <div key={b.label}>
            <div className="flex justify-between text-sm">
              <span>{b.label}</span>
              <span>{b.used.toLocaleString()} / {b.limit.toLocaleString()}</span>
            </div>
            <div className="progress mt-1"><span style={{ width: `${Pct(b.used, b.limit)}%` }} /></div>
          </div>
        ))}
      </div>

      <div className="card mt-4">
        <p className="font-semibold">Daily search limit</p>
        <p className="text-sm text-slate-600">Up to {ent.dailySearchLimit} searches per day.</p>
        <p className="font-semibold mt-4">Max results per search</p>
        <p className="text-sm text-slate-600">Up to {ent.maxResultsPerSearch.toLocaleString()} per query.</p>
        <p className="font-semibold mt-4">API access</p>
        <p className="text-sm text-slate-600">{ent.apiAccess ? `Enabled (${ent.apiMonthlyQuota.toLocaleString()} requests/mo)` : "Not enabled on your plan"}</p>
      </div>
    </div>
  );
}
