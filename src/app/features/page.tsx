import { MarketingShell } from "@/components/MarketingShell";

export default function FeaturesPage() {
  const features = [
    { t: "Any niche", d: "Freely type your niche — no pre-defined category list required." },
    { t: "Any supported country", d: "Global coverage through the configured providers." },
    { t: "Any city or region", d: "Cities, states, postal codes, and coordinates are all supported." },
    { t: "Multi-provider search", d: "OpenStreetMap and Google Places work in parallel." },
    { t: "Fallback system", d: "If one provider fails or has no coverage, LeadGen 2.0 falls back to the next." },
    { t: "Intelligent deduplication", d: "Records are merged using strong signals (phone, domain, source id)." },
    { t: "Data quality score", d: "Every lead gets a 0–100 completeness score with a per-field breakdown." },
    { t: "International phone numbers", d: "Normalized to E.164 with libphonenumber-js." },
    { t: "Unicode-ready", d: "Arabic, Cyrillic, Chinese, Japanese, Korean, and accented Latin scripts." },
    { t: "Built-in CRM", d: "Status, tags, notes, and follow-up reminders for every lead." },
    { t: "CSV / XLSX / JSON export", d: "Export selected, filtered, or all of your leads." },
    { t: "Free trial", d: "Try the platform with a configurable trial window and lead allowance." },
    { t: "Refunds & cancellation", d: "Cancel anytime. Lifetime plans include a 14-day refund window." },
    { t: "Customer API", d: "Programmatic access for paid plans." },
    { t: "Team accounts", d: "Owner / Admin / Member roles on the Business plan." },
    { t: "Referrals & affiliates", d: "Configurable reward programs." },
  ];
  return (
    <MarketingShell>
      <section className="container-app py-12">
        <h1 className="text-3xl md:text-4xl font-bold text-center">Features</h1>
        <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {features.map((f) => (
            <div key={f.t} className="card">
              <p className="font-semibold">{f.t}</p>
              <p className="text-sm text-slate-600 mt-1">{f.d}</p>
            </div>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
