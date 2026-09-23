import { listProviders } from "@/providers";

export default function AdminProvidersPage() {
  const list = listProviders();
  return (
    <div>
      <h2 className="text-xl font-bold">Providers</h2>
      <p className="text-sm text-slate-600">
        Configure provider priorities in <code>src/providers/index.ts</code> and individual keys in <code>.env</code>.
        Enable/disable each provider via <a className="underline" href="/admin/feature-flags">Feature flags</a>.
      </p>
      <div className="grid md:grid-cols-2 gap-3 mt-4">
        {list.map((p) => {
          const c = p.getCapabilities();
          return (
            <div key={p.getProviderName()} className="card">
              <p className="font-bold capitalize">{p.getProviderName()}</p>
              <ul className="text-sm mt-2 space-y-1">
                <li>API key required: {c.requiresApiKey ? "yes" : "no"}</li>
                <li>Global coverage: {c.global ? "yes" : "no"}</li>
                <li>Free quota / month: {c.freeQuotaPerMonth === 0 ? "depends on usage policy" : c.freeQuotaPerMonth}</li>
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
