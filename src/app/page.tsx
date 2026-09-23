import Link from "next/link";
import { MarketingShell } from "@/components/MarketingShell";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale, type Locale, translate } from "@/lib/i18n";

export default function HomePage() {
  const cookie = cookies().get("lg_locale")?.value;
  const locale: Locale = isLocale(cookie) ? cookie : DEFAULT_LOCALE;
  const t = (k: string) => translate(locale, k);

  return (
    <MarketingShell>
      <section className="container-app py-16 md:py-24 text-center">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
          {t("landing.hero.title")}
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-600">
          {t("landing.hero.subtitle")}
        </p>
        <div className="mt-8 flex justify-center gap-3 flex-wrap">
          <Link href="/signup" className="btn btn-primary text-base px-6 py-3">
            {t("cta.start")}
          </Link>
          <Link href="/signup?demo=1" className="btn btn-secondary text-base px-6 py-3">
            {t("cta.demo")}
          </Link>
        </div>
        <p className="mt-6 text-xs text-slate-500 max-w-2xl mx-auto">
          {t("landing.coverageNote")}
        </p>
      </section>

      <section className="container-app grid md:grid-cols-3 gap-4 pb-12">
        {[
          { t: "Global search", d: "Search any business niche in any country, city, or postal code." },
          { t: "Multi-provider", d: "OpenStreetMap and Google Places work together with automatic fallback." },
          { t: "Auto-deduplication", d: "Records are merged across providers using phone, domain, and coordinates." },
          { t: "Data quality scoring", d: "Every lead gets a 0–100 completeness score you can trust." },
          { t: "Built-in CRM", d: "Status, tags, notes, and follow-up reminders for every lead." },
          { t: "Export anywhere", d: "CSV, XLSX, or JSON. Filtered, selected, or all of your leads." },
        ].map((f) => (
          <div key={f.t} className="card">
            <p className="font-semibold">{f.t}</p>
            <p className="text-sm text-slate-600 mt-2">{f.d}</p>
          </div>
        ))}
      </section>

      <section className="container-app pb-16">
        <div className="card">
          <p className="font-semibold mb-2">Frequently asked questions</p>
          <p className="text-sm text-slate-600">
            See our <Link className="text-brand-700 underline" href="/faq">full FAQ</Link> for answers about
            coverage, the demo mode, plans, refunds, and the data quality score.
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
