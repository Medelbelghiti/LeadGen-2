import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowRight, Car, Fuel, Receipt, TrendingDown, LineChart, FileText, Sparkles, ShieldCheck } from "lucide-react";
import { MarketingShell } from "@/components/MarketingShell";
import { DEFAULT_LOCALE, isLocale, type Locale, translate } from "@/lib/i18n";

export default function HomePage() {
  const cookie = cookies().get("lg_locale")?.value;
  const locale: Locale = isLocale(cookie) ? cookie : DEFAULT_LOCALE;
  const t = (k: string) => translate(locale, k);

  return (
    <MarketingShell>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-50 via-white to-charcoal-50 dark:from-emerald-950/20 dark:via-charcoal-950 dark:to-charcoal-900" />
        <div className="max-w-6xl mx-auto px-6 pt-20 pb-24 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="badge badge-ok mb-4">
              <Sparkles className="w-3 h-3 mr-1" /> {t("hero.badge")}
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05]">
              {t("hero.title")}
            </h1>
            <p className="mt-5 text-lg text-charcoal-600 dark:text-charcoal-300 max-w-xl">
              {t("hero.subtitle")}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/signup" className="btn btn-accent px-6 py-3 text-base">
                {t("hero.cta_primary")} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/calculators/car-cost" className="btn btn-secondary px-6 py-3 text-base">
                {t("hero.cta_secondary")}
              </Link>
            </div>
            <p className="mt-5 text-xs text-charcoal-500 max-w-lg">
              {t("hero.disclaimer")}
            </p>
          </div>
          <div className="relative">
            <FinancialTwinPreview />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center">{t("how.title")}</h2>
        <div className="mt-10 grid md:grid-cols-4 gap-4">
          {[
            { n: 1, icon: Car, t: t("how.s1.t"), d: t("how.s1.d") },
            { n: 2, icon: Fuel, t: t("how.s2.t"), d: t("how.s2.d") },
            { n: 3, icon: Receipt, t: t("how.s3.t"), d: t("how.s3.d") },
            { n: 4, icon: LineChart, t: t("how.s4.t"), d: t("how.s4.d") },
          ].map((s) => (
            <div key={s.n} className="card">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-charcoal-900 text-white dark:bg-white dark:text-charcoal-900 inline-flex items-center justify-center text-sm font-bold">{s.n}</span>
                <s.icon className="w-5 h-5 text-charcoal-400" />
              </div>
              <p className="mt-3 font-semibold">{s.t}</p>
              <p className="text-sm text-charcoal-500 mt-1">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-3 gap-4">
          <FeatureCard icon={TrendingDown} title={t("features.cost.title")} desc={t("features.cost.desc")} />
          <FeatureCard icon={Fuel} title={t("features.fuel.title")} desc={t("features.fuel.desc")} />
          <FeatureCard icon={LineChart} title={t("features.twin.title")} desc={t("features.twin.desc")} />
          <FeatureCard icon={FileText} title={t("features.reports.title")} desc={t("features.reports.desc")} />
          <FeatureCard icon={Sparkles} title={t("features.ai.title")} desc={t("features.ai.desc")} />
          <FeatureCard icon={ShieldCheck} title={t("features.privacy.title")} desc={t("features.privacy.desc")} />
        </div>
      </section>

      {/* Promise */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h2 className="text-2xl md:text-3xl font-bold">{t("promise.title")}</h2>
        <p className="mt-4 text-charcoal-600 dark:text-charcoal-300">{t("promise.body")}</p>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <div className="card bg-charcoal-900 text-white border-0 dark:bg-emerald-700/15 dark:text-white">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-xl font-bold">{t("cta.title")}</p>
              <p className="text-charcoal-300 mt-1">{t("cta.body")}</p>
            </div>
            <Link href="/signup" className="btn btn-accent px-6 py-3 text-base">
              {t("cta.button")} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="card">
      <Icon className="w-6 h-6 text-emerald-600" />
      <p className="mt-3 font-semibold">{title}</p>
      <p className="text-sm text-charcoal-500 mt-1">{desc}</p>
    </div>
  );
}

function FinancialTwinPreview() {
  return (
    <div className="card shadow-elevated">
      <div className="flex items-center justify-between">
        <div>
          <p className="label">Financial Twin</p>
          <p className="font-semibold mt-1">2021 BMW X5 xDrive40i</p>
        </div>
        <span className="badge badge-ok">Sample data</span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Stat label="Monthly cost" value="$487" />
        <Stat label="Cost / km" value="$0.31" />
        <Stat label="Annual cost" value="$5,844" />
        <Stat label="12-mo forecast" value="$5,920" accent />
      </div>
      <div className="mt-5">
        <p className="text-xs text-charcoal-500 mb-2">Where the money goes</p>
        <Bar pct={42} label="Fuel" color="bg-emerald-500" />
        <Bar pct={28} label="Maintenance" color="bg-charcoal-700" />
        <Bar pct={18} label="Insurance" color="bg-amber-500" />
        <Bar pct={12} label="Other" color="bg-charcoal-400" />
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`p-3 rounded-lg ${accent ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-charcoal-50 dark:bg-charcoal-800/60"}`}>
      <p className="text-xs text-charcoal-500">{label}</p>
      <p className={`text-xl font-bold mt-0.5 ${accent ? "text-emerald-700 dark:text-emerald-300" : ""}`}>{value}</p>
    </div>
  );
}

function Bar({ pct, label, color }: { pct: number; label: string; color: string }) {
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-charcoal-600">{label}</span>
        <span className="text-charcoal-500">{pct}%</span>
      </div>
      <div className="progress"><span className={color} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}
