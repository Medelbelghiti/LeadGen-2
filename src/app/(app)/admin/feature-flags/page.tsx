"use client";
import { useEffect, useState } from "react";

const FLAG_KEYS = [
  "ai_enrichment", "google_provider", "osm_provider", "demo_provider",
  "api_access", "referral_system", "affiliate_system", "lifetime_plan",
  "team_accounts", "registration",
];

export default function AdminFeatureFlagsPage() {
  const [flags, setFlags] = useState<Record<string, boolean>>({});

  const refresh = async () => {
    const r = await fetch("/api/admin/feature-flags");
    if (r.ok) setFlags((await r.json()).flags);
  };
  useEffect(() => { void refresh(); }, []);

  const set = async (key: string, enabled: boolean) => {
    await fetch("/api/admin/feature-flags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, enabled }),
    });
    void refresh();
  };

  return (
    <div>
      <h2 className="text-xl font-bold">Feature flags</h2>
      <div className="card mt-4">
        <table className="basic">
          <thead><tr><th>Key</th><th>Enabled</th></tr></thead>
          <tbody>
            {FLAG_KEYS.map((k) => (
              <tr key={k}>
                <td><code>{k}</code></td>
                <td>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={!!flags[k]} onChange={(e) => set(k, e.target.checked)} />
                    {flags[k] ? "on" : "off"}
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
