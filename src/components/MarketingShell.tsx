import Link from "next/link";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale, type Locale, translate } from "@/lib/i18n";
import { LocaleSwitcher } from "./LocaleSwitcher";

export function MarketingShell({ children }: { children: React.ReactNode }) {
  const cookie = cookies().get("lg_locale")?.value;
  const locale: Locale = isLocale(cookie) ? cookie : DEFAULT_LOCALE;
  const t = (k: string) => translate(locale, k);
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white">
        <div className="container-app flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-block w-7 h-7 rounded-md bg-brand-600" />
            <span className="font-bold text-lg">{t("brand.name")}</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/features" className="hidden md:inline">{translate(locale, "nav.features", "Features")}</Link>
            <Link href="/pricing">{t("nav.billing")}</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/docs">Docs</Link>
            <LocaleSwitcher current={locale} />
            <Link href="/login" className="btn btn-secondary">{t("nav.login")}</Link>
            <Link href="/signup" className="btn btn-primary">{t("nav.signup")}</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t bg-white">
        <div className="container-app grid md:grid-cols-4 gap-6 text-sm">
          <div>
            <p className="font-semibold mb-2">{t("brand.name")}</p>
            <p className="text-slate-600">{t("brand.tagline")}</p>
          </div>
          <div>
            <p className="font-semibold mb-2">Product</p>
            <ul className="space-y-1 text-slate-600">
              <li><Link href="/features">Features</Link></li>
              <li><Link href="/pricing">Pricing</Link></li>
              <li><Link href="/faq">FAQ</Link></li>
              <li><Link href="/docs">Docs</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2">Company</p>
            <ul className="space-y-1 text-slate-600">
              <li><Link href="/terms">Terms</Link></li>
              <li><Link href="/privacy">Privacy</Link></li>
              <li><Link href="/refund-policy">Refund policy</Link></li>
              <li><Link href="/acceptable-use">Acceptable use</Link></li>
              <li><Link href="/affiliate-terms">Affiliate terms</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2">Account</p>
            <ul className="space-y-1 text-slate-600">
              <li><Link href="/login">Log in</Link></li>
              <li><Link href="/signup">Sign up</Link></li>
            </ul>
          </div>
        </div>
        <div className="container-app text-xs text-slate-500 mt-6">
          © {new Date().getFullYear()} {t("brand.name")}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
