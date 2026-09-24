import Link from "next/link";
import { DEFAULT_LOCALE, isLocale, type Locale, translate } from "@/lib/i18n";
import { Car } from "lucide-react";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { cookies } from "next/headers";

export function MarketingShell({ children }: { children: React.ReactNode }) {
  const cookie = cookies().get("lg_locale")?.value;
  const locale: Locale = isLocale(cookie) ? cookie : DEFAULT_LOCALE;
  const t = (k: string) => translate(locale, k);
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur bg-white/80 dark:bg-charcoal-950/80 border-b border-charcoal-200/70 dark:border-charcoal-800">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-charcoal-900 text-white dark:bg-white dark:text-charcoal-900">
              <Car className="w-4 h-4" />
            </span>
            <span>AutoEco</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/features" className="text-charcoal-600 hover:text-charcoal-900 dark:text-charcoal-300 dark:hover:text-white">
              {t("nav.features")}
            </Link>
            <Link href="/calculators/car-cost" className="text-charcoal-600 hover:text-charcoal-900 dark:text-charcoal-300 dark:hover:text-white">
              {t("nav.calculators")}
            </Link>
            <Link href="/pricing" className="text-charcoal-600 hover:text-charcoal-900 dark:text-charcoal-300 dark:hover:text-white">
              {t("nav.pricing")}
            </Link>
            <Link href="/docs" className="text-charcoal-600 hover:text-charcoal-900 dark:text-charcoal-300 dark:hover:text-white">
              {t("nav.docs")}
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <LocaleSwitcher current={locale} />
            <Link href="/login" className="btn btn-ghost">{t("nav.login")}</Link>
            <Link href="/signup" className="btn btn-primary">{t("nav.signup")}</Link>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-charcoal-200 dark:border-charcoal-800 mt-16">
        <div className="max-w-6xl mx-auto px-6 py-10 grid md:grid-cols-4 gap-8 text-sm">
          <div>
            <Link href="/" className="flex items-center gap-2 font-bold">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-charcoal-900 text-white dark:bg-white dark:text-charcoal-900">
                <Car className="w-3.5 h-3.5" />
              </span>
              AutoEco
            </Link>
            <p className="mt-3 text-charcoal-500">{t("brand.tagline")}</p>
          </div>
          <FooterCol title="Product" links={[
            { href: "/features", label: t("nav.features") },
            { href: "/calculators/car-cost", label: t("nav.calculators") },
            { href: "/pricing", label: t("nav.pricing") },
            { href: "/docs", label: t("nav.docs") },
          ]} />
          <FooterCol title="Company" links={[
            { href: "/terms", label: t("legal.terms") },
            { href: "/privacy", label: t("legal.privacy") },
            { href: "/acceptable-use", label: t("legal.aup") },
            { href: "/refund-policy", label: t("legal.refund") },
          ]} />
          <FooterCol title="Account" links={[
            { href: "/login", label: t("nav.login") },
            { href: "/signup", label: t("nav.signup") },
          ]} />
        </div>
        <div className="border-t border-charcoal-200 dark:border-charcoal-800 py-5 text-center text-xs text-charcoal-500">
          © {new Date().getFullYear()} AutoEco. {t("footer.disclaimer")}
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <p className="font-semibold mb-2">{title}</p>
      <ul className="space-y-1 text-charcoal-500">
        {links.map((l) => (
          <li key={l.href}><Link href={l.href} className="hover:text-charcoal-900 dark:hover:text-white">{l.label}</Link></li>
        ))}
      </ul>
    </div>
  );
}
