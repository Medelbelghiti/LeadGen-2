"use client";
import { useEffect, useState } from "react";

const SECTIONS: { title: string; keys: { key: string; label: string; type?: "text" | "number" | "boolean" }[] }[] = [
  {
    title: "Free trial",
    keys: [
      { key: "trial_enabled", label: "Enabled", type: "boolean" },
      { key: "trial_duration_days", label: "Duration (days)", type: "number" },
      { key: "trial_lead_limit", label: "Lead limit", type: "number" },
      { key: "trial_search_limit", label: "Search limit", type: "number" },
      { key: "trial_export_limit", label: "Export limit (rows)", type: "number" },
    ],
  },
  {
    title: "Referrals",
    keys: [
      { key: "referral_enabled", label: "Enabled", type: "boolean" },
      { key: "referral_reward_type", label: "Reward type (LEADS_BONUS|COMMISSION_PERCENT|PLAN_MONTH)" },
      { key: "referral_reward_value", label: "Reward value", type: "number" },
      { key: "referral_reward_plan_key", label: "Plan key (for PLAN_MONTH)" },
      { key: "referral_commission_percent", label: "Commission %", type: "number" },
    ],
  },
  {
    title: "Affiliates",
    keys: [
      { key: "affiliate_enabled", label: "Enabled", type: "boolean" },
      { key: "commission_percentage", label: "Commission %", type: "number" },
      { key: "cookie_duration_days", label: "Cookie duration (days)", type: "number" },
      { key: "minimum_payout_cents", label: "Min payout (cents)", type: "number" },
      { key: "payout_method", label: "Payout method" },
    ],
  },
  {
    title: "Cost control",
    keys: [
      { key: "max_requests_per_search", label: "Max requests / search", type: "number" },
      { key: "max_results_hard_cap", label: "Hard cap on results", type: "number" },
      { key: "daily_provider_request_limit", label: "Daily provider request limit", type: "number" },
      { key: "monthly_provider_request_limit", label: "Monthly provider request limit", type: "number" },
    ],
  },
];

export default function AdminSettingsPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings").then((r) => r.json()).then((j) => setValues(j.values));
  }, []);

  const save = async () => {
    const entries = Object.entries(values).map(([key, value]) => ({ key, value }));
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <h2 className="text-xl font-bold">Settings</h2>
      {SECTIONS.map((s) => (
        <div key={s.title} className="card mt-4">
          <p className="font-semibold">{s.title}</p>
          <div className="grid md:grid-cols-2 gap-2 mt-2 text-sm">
            {s.keys.map((k) => (
              <div key={k.key}>
                <label className="label">{k.label}</label>
                {k.type === "boolean" ? (
                  <select className="select" value={values[k.key] ?? "false"} onChange={(e) => setValues({ ...values, [k.key]: e.target.value })}>
                    <option value="true">true</option><option value="false">false</option>
                  </select>
                ) : (
                  <input className="input" type={k.type === "number" ? "number" : "text"} value={values[k.key] ?? ""} onChange={(e) => setValues({ ...values, [k.key]: e.target.value })} />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      <button onClick={save} className="btn btn-primary mt-4">Save all settings</button>
      {saved && <span className="ml-3 text-sm text-green-700">✓ Saved</span>}
    </div>
  );
}
